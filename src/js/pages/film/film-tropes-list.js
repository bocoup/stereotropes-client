define(function(require) {
  var Promise = require('bluebird');
  var Backbone = require('backbone');
  var d3 = require("d3");
  var _ = require("lodash");
  require("../../shared/d3.text");
  var View = require("../../core/view");
  var dataManager = require('../../data/data_manager');
  var tropeList = require("./film-tropes-list-vis");
  var Analytics = require("../../shared/analytics");

  var template = require("tmpl!../../pages/film/film-tropes-list");

  var genderBarTemplate = require("tmpl!../../shared/gender-split-bar");

  /**
   * Defines a view that wraps the above visualization
   * @param  {Options} options Requires: width, film_id
   * @return {Backbone.View}
   */
  return View.extend({
    template: template,
    initialize: function(options) {
      this.film_id = options.film_id;
      this.options = options;
    },
    /**
     * _preDataRender - build html view
     *
     * @return {undefined}
     */
    _preDataRender: function() {
      this.$el.html(this.template());
      return this;
    },
    /**
     * cleanRole - improve look of roles
     *
     * @param role
     * @return {string} - pretty role
     */
    cleanRole: function(role) {
      // some roles were ending with a ':'
      role = role.replace(/:\s*$/,'.');
      // many roles have the role id and
      // then a : at the beginning
      role = role.replace(/^.*:\s*/,'');
      return role;

    },
    /**
     * isValidRole - is the role
     * string worthy of displaying?
     *
     * @param role
     * @return {boolean}
     */
    isValidRole: function(role) {
      // make a first pass at filtering
      // out completely useless roles
      return role.length > 3;
    },
    // TODO: better location for these data functions?
    /**
     * collapseRoles - combine roles with the same id
     * for the movie.
     *
     * @param rawRoles - raw roles from dataManager
     * @return {}
     */
    collapseRoles: function(rawRoles) {
      var self = this;
      // just makes sure we have both groups
      var roles = {'f':[],'m':[]};
      d3.keys(rawRoles).forEach(function(g) {
        // use d3.nest for the grouping
        var tropeNest = d3.nest()
          .key(function(d) { return d.id; })
          .entries(rawRoles[g]);

        // need to grab each copies role
        tropeNest.forEach(function(d) {
          var trope = {"id":d.key, roles:[]};
          // get all the roles for this trope and
          // clean them up
          var tropeRoles = d.values.map(function(v) {
            return self.cleanRole(v.role);
          });
          // find the longest role string for this trope
          var role = _.max(tropeRoles, function(r) {return r.length; });

          // if it is a valid role, then
          // it becomes our trope's role
          if(self.isValidRole(role)) {
            trope.roles.push(role);
          }

          // if this trope has at least one
          // role, then add it.
          if(trope.roles.length > 0) {
            roles[g].push(trope);
          }

        });

      });
      return roles;
    },

    /**
     * getRoleDetails - pull out trope details for
     * all roles in movie
     *
     * @param roles
     * @return {object} - of promises keyed by their id's
     */
    getRoleDetails: function(roles) {
      var tropeIds, promise, promises = [], details = {};

      d3.keys(roles).forEach(function(g) {

        tropeIds = roles[g].map(function(trope) {
          return trope.id;
        });

        promise = dataManager.getTropes(tropeIds).then(function(tropes) {
         _.each(tropes, function(trope) {
            details[trope.id] = trope;
          });
        });

        promises.push(promise);
      });

      return Promise.settle(promises).then(function() {
        return details;
      });
    },
    /**
     * addRoleDetails - combine roles and details for
     * each trope to allow for trope's name to be
     * used in vis.
     * WARNING: details added in-place to roles
     *
     * @param roles
     * @param roleDetails
     * @return {array}
     */
    addRoleDetails: function(roles, roleMap) {
      // iterate through role genders
      d3.keys(roles).forEach(function(gender) {
        // iterate over the tropes in each role
        var i = roles[gender].length;
        // reversed order of iteration to remove
        // invalid roles using splice.
        // http://stackoverflow.com/questions/9882284/looping-through-array-and-removing-items-without-breaking-for-loop
        while(i--) {
          roles[gender][i].details = roleMap[roles[gender][i].id];
          // remove if there aren't any details
          // for this role
          if(!roles[gender][i].details) {
            roles[gender].splice(i,1);
          }
        }
      });
      return roles;
    },
    /**
     * resize - update the width of the vis
     *
     * @param options - needs options.width
     * @return {this}
     */
    resize: function(options) {
      this.options.width = options.width;
      this.list.width(this.options.width);
      this.list.resize();
      return this;
    },
    /**
     * _render - render function
     * Display the view
     *
     * @return {undefined}
     */
    _render: function() {
      var self = this;
      // add the template to the page
      self._preDataRender();
      // create an instance of the vis
      self.list = tropeList();
      // set its width
      self.list.width(self.options.width);

      return dataManager.getFilmDetails(this.film_id).then(function(film_details) {

        // since a film can have same role multiple times
        // we need to collapse them down to unique roles
        var roles = self.collapseRoles(film_details.roles);

        // now grab all their details. getRoleDetails returns
        // an array of promises that we wait for to fulfill
        var roleDetailPromises = self.getRoleDetails(roles);
        return Promise.props(roleDetailPromises).then(function(roleDetails) {

          // now we have all the details, we need to
          // merge them back with the roles.
          self.addRoleDetails(roles, roleDetails);

          // pass in counts to gender split to proportion them by gender
          var sum = d3.sum(d3.values(roles), function(v) { return v.length; });
          var percents = {};
          d3.entries(roles).forEach(function(e) {
            percents[e.key]  = Math.round((e.value.length / sum) * 100.0);
          });

          self.$el.find(".gender-split-bar-container")
            .html(genderBarTemplate({"percents":percents}));
          // display the trope list visual!
          var vis = d3.select(self.$el.find('.vis')[0]);
          vis.datum(roles)
            .call(self.list);

          self.list.on("tropeSelected", function(id) {
            Backbone.history.navigate('/tropes/' + id, { trigger: true });
          });

          return self;
        }).catch(function(e) {
          var error = e.responseText;
          error = error || e.message;
          Analytics.trackError(error);
        });

      });
    }
  });
});
