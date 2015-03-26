define(function(require) {
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../trope/trope-tile');
  var Promise = require('bluebird');

  return View.extend({
    template : template,

    className : 'trope-tile',

    /**
     * Initialize new trope tile. You can either provide:
     * trope_id, which will fetch the tile details from the dict,
     * or you can provide data, the full tile info for rendering.
     * @constructor
     * @param  {Object} options Optional arguments
     */
    initialize: function(options) {
      if (!options.trope_id && !options.trope_data) {
        throw new Error("Trope id or trope data required for rendering trope tile!");
      }

      if (options.trope_data) {
        this.data = options.trope_data;
      } else {
        this.trope_id = options.trope_id;
        this.data = {
          loading : true
        };
      }
    },

    /**
     * Returns tile type, which is trope
     * @return {String} tile type 'trope'
     */
    type: function() {
      return "trope";
    },

    /**
     * Shows a tile. optionally with a delay
     * @param  {number} [delay] delay for showing of tile
     * @return {Promise}       Promise that gets resolved when tile is shown
     */
    show: function(delay) {
      var self = this;
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          self.$el.show();
          resolve();
        }, delay || 0);
      });
    },

    /**
     * Hides a tile. optionally with a delay
     * @param  {number} [delay] delay for hiding of tile
     * @return {Promise}       Promise that gets resolved when tile is hidden
     */
    hide: function(delay) {
      var self = this;
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          self.$el.hide();
          resolve();
        }, delay || 0);
      });
    },

    /**
     * Pre render routine, for rendering template with data
     * @private
     * @return {View} self instance
     */
    _preDataRender: function() {
      this.$el.html(this.template(this.data));
      return this;
    },

    /**
     * Renders the tile. It gets data if it doesn't have it,
     * otherwise if it does, it just renders it and saves a few
     * data items on the tile element.
     * @return {Promise} Promise
     */
    _render: function() {
      var self = this;
      this._preDataRender();

      var promise = new Promise(function(resolve, reject) {
        if (self.data.loading) {
          return dataManager.getTrope(self.trope_id)
            .then(function(data) {
              self.data = data;
              resolve();
            }).catch(function(err) { reject(err); });
        } else {
          resolve();
        }
      });

      return promise.then(function() {
        self.data.loading = false;

        // set gender class on container
        self.$el.addClass('gender-' + self.data.gender);
        self.$el.data('trope-id', self.data.id);
        self.$el.data('gender', self.data.gender);

        self.$el.html(self.template(self.data));
        return self;
      });
    },

    /**
     * Fades out a tile for removal
     * @todo Does this need to just use this.hide?
     * @return {Promise} Promise
     */
    _remove: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.$el.fadeOut(200, resolve);
      });
    }
  });
});