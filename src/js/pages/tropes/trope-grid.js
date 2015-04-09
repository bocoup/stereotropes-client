define(function(require) {

  var _ = require('lodash');
  var $ = require('jquery');
  var Backbone = require('backbone');
  var View = require('../../core/view');
  var template = require('tmpl!../tropes/tropes-page');
  var Promise = require('bluebird');
  var dataManager = require('../../data/data_manager');
  var TropeTile = require('../trope/trope-tile');
  var TextTile = require('../../shared/text-tile');
  var Analytics = require("../../shared/analytics");

  var templates = {
    introTile : require('tmpl!../tropes/tropes-page-intro'),
    navTile : require('tmpl!../tropes/tropes-page-nav-tile')
  };

  // Special tile used to switch between female & male
  // tile subsets
  var FilterTextTile = TextTile.extend({

    /**
     * available states and their respective templates.
     * @type {Object}
     */
    states : {
      'default' : require('tmpl!../tropes/text-tile-filter'),
      'm' : require('tmpl!../tropes/text-tile-filter-m'),
      'f' : require('tmpl!../tropes/text-tile-filter-f')
    },

    /**
     * Custom class name for this tile
     * @type {String}
     */
    classname: 'filter',

    initialize: function() {

      // default template to render
      this.currentState = 'default';
    },

    /**
     * Sets the state and conducts the appropriate transition of
     * this tile based on where it came and where it went.
     * @param {string} toState To state
     * @param {Object} [options] Optional arguments
     * @return {Promise} Promise
     */
    setState: function(toState, options) {

      // Going from default => filter
      if (toState === 'filter') {
        // male:
        if (options.gender === 'm') {
          return this.goToState('m');
        // female:
        } else if (options.gender === 'f') {
          return this.goToState('f');
        // back to default:
        } else if (options.gender === 'all') {
          return this.goToState('default');
        }
      }

      // Going from filter => default
      if ((this.currentState === 'f' || this.currentState === 'm') &&
          toState === 'default') {
        return this.goToState('default');
      }
    }
  });

  // Main grid view
  return View.extend({
    template : template,
    events: {
      'click .trope-tile': '_tileClick'
    },

    /**
     * Filters to be used for tile updating. these match
     * different states that the grid can snap to.
     * @type {Object}
     */
    filters: {
      'default': function() { return true; },
      'filter': {
        'm' : function(t) { return this.data.gender === 'm'; },
        'f': function(t) { return this.data.gender === 'f'; }
      }
    },

    /**
     * Constructor for grid of trope tiles.
     * @constructor
     * @return {[type]} [description]
     */
    initialize: function() {
      this.tiles = [];
      this.specialTiles = {};
      this.currentState = 'init';
    },

    /**
     * Pre render template empty
     * @private
     */
    _preRender: function() {
      this.$el.html(this.template());
    },

    /**
     * Gets the trope data and filters it
     * @private
     * @param  {String[]} tropeList List of trope ids to fetch
     * @return {Promise}  Returns promise
     */
    _getTropeMetadata: function (tropeList) {
      return dataManager.getTropes(tropeList)
        // filter out ones without images
        .then(function(tropes) {
          return tropes.filter(function(trope) {
            return trope.image_url !== null;
          });
        })

        // arrange by filter list, since it's a topN and thus
        // order is significant
        .then(function(tropes) {
          var tropesArranged = [];
          tropes.forEach(function(trope) {
            tropesArranged[tropeList.indexOf(trope.id)] = trope;
          });
          return _.compact(tropesArranged);
        });
    },

    /**
     * Click handler for trope tiles
     * @private
     * @param  {jquery.event} ev Event
     * @return {boolean}      returns false.
     */
    _tileClick: function(ev) {
      var target = $(ev.target).closest('.trope-tile');
      var tropeId = target.data('trope-id');
      Backbone.history.navigate('tropes/' + tropeId, { trigger: true });
      return false;
    },

    /**
     * Switches the grid to a certain state. When doing so it:
     * 1. Updates the special tiles
     * 2. Updates the tiles themselves.
     * @param  {[type]} toState [description]
     * @param  {[type]} options [description]
     * @return {[type]}         [description]
     */
    goToState: function(toState, options) {
      var self = this;
      return Promise.settle(
        [
          // update special tiles with current state and options
          self.specialTiles.filter.setState(toState, options),

          // update current tiles with state and options
          self._updateTiles(toState, options)
        ]
      );
    },

    _render: function() {
      var self = this;
      return dataManager.getTropeList()

        // get the resolved trope details with all the metadata
        // we need to render tiles
        .then(this._getTropeMetadata)

        // make trope tiles for everything
        .then(function(tropes){

          // make intro tile
          var introTile = new TextTile({
            template: templates.introTile,
            classname: 'tropes'
          });

          introTile.$el.on('click', 'a.gender-filter', function(ev) {
            var el = $(ev.target);
            var gender = el.data('gender');

            self.goToState('filter', { gender: gender });
            Analytics.trackEvent("tropes-page", "filter", gender);
          });

          // Make filter tile

          var filterTile = new FilterTextTile({});

          filterTile.$el.on('click a', function(ev) {
            var gender = $(ev.target).data('gender');
            if (gender !== 'all') {
              self.goToState('filter', { gender : gender});
              Analytics.trackEvent("tropes-page", "filter", gender);
            } else {
              self.goToState('default');
            }
            return false;
          });

          // Make nav tile
          var navTile = new TextTile({
            template: templates.navTile,
            classname: 'navTile'
          });



          self.specialTiles['introTile'] = introTile;
          self.specialTiles['filter'] = filterTile;
          self.specialTiles['nav'] = navTile;

          self.tiles.push(introTile);

          tropes.forEach(function(trope, idx){
            if (idx === 3) {
              self.tiles.push(filterTile);
            }
            if (idx === 5) {
              self.tiles.push(navTile);
            }
            self.tiles.push(new TropeTile({ trope_data : trope }));
          });

          return self.tiles;
        })

        // render all tropes
        .then(function(tropeViews) {
          return tropeViews.map(function(tropeView, idx) {
            tropeView.render();
            return tropeView;
          });
        })
        .then(function(tropeViews) {
          return tropeViews.map(function(tropeView, idx) {
            self.tiles.push(tropeView);
            self.$el.append(tropeView.$el);
          });
        });

    },



    /**
     * shows/hides tiles based on their ability to pass a filter function
     * @param  {Function} filterFn pass/fail function for tile visibility
     * @return {Promise}          Promise
     */
    _toggleTiles: function(filterFn) {
      return Promise.settle(this.tiles.map(function(tile, idx) {
        if (tile.type() === 'trope') {
          if (filterFn.apply(tile)) {
            return tile.show(idx * 10);
          } else{
            return tile.hide(idx * 10);
          }
        }
      }));
    },

    /**
     * Updates tiles to a specific state
     * @private
     * @param  {string} state   state name
     * @param  {Object} [options] Optional options
     * @return {Promise} Promise
     */
    _updateTiles: function(state, options) {
      var self = this, filterFn;
      if (state === 'default') {
        filterFn = self.filters.default;
      } else {
        filterFn = self.filters.filter[options.gender];
      }
      return self._toggleTiles(filterFn);
    },


    /**
     * Removes tiles. Just fades them all... we tried a stepped
     * down removal, but it's too slow and annoying.
     * @private
     * @return {Promise} Promise
     */
    _remove: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.$el.fadeOut(300, resolve);
      });
    }
  });

});
