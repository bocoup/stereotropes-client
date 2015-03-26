define(function(require) {
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../film/film-tile');
  var Promise = require('bluebird');
  var _ = require('underscore');

  return View.extend({
    template : template,

    className : 'film-tile',

    events: {
      "click" : "click"
    },

    initialize: function(data) {
      if (!data.id) {
        throw new Error("Film id required for rendering film tile!");
      }

      this.film_data = {
        id: data.id,
        poster_url : data.poster_url,
        name : data.name,
        loading : true,
        url_root: "/assets/data/films/posters/"
      };

      // if we already have all the info we need, then we are already loaded.
      // too hacky?
      if(!(_.isUndefined(this.film_data.name)) &&
         !(_.isUndefined(this.film_data.poster_url))) {
        this.film_data.loading = false;
      }

      this.id = data.id;
    },

    _preDataRender: function() {
      this.$el.html(this.template(this.film_data));
      return this;
    },

    _render: function() {
      var self = this;
      this._preDataRender();

      if(self.found()) {
        self.$el.html(self.template(self.film_data));
        return self;
      } else {
        return dataManager.getFilmDetails(this.id).then(function(film_details) {
          self.film_data = _.extend(self.film_data, film_details);
          self.film_data.loading = false;

          self.$el.html(self.template(self.film_data));
          return self;
        }).catch(function(e) {
          console.log(e.responseText);
          return self;
        });
      }
    },

    _remove: Promise.method(function() {
      return this.$el.fadeOut().empty();
    }),

    click: function() {
      this.trigger("film-select", this.id);
    },
    found: function() {
      return !this.film_data.loading;
    }
  });
});
