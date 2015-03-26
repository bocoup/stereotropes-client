define(function(require) {
  var View = require('../core/view');
  // var dataManager = require('../../data/data_manager');
  var Promise = require('bluebird');
  var _ = require('lodash');

  return View.extend({
    tag: 'div',
    className: 'text-tile',

    /**
     * Initializes a new text tile
     * @constructor
     * @param  {Object} options Options
     * @param  {Function} options.template Template to render into the tile
     * @param  {Object} options.data Data to pass to the template
     * @param  {String} options.classname Classname to assign to this tile, for sizing info
     */
    initialize: function(options) {

      this.data = options.data || {}; // default data is empty
      this.classname = options.classname || false; // no additional class by default
      this.states = options.states || {
        'default' : options.template || _.template('')
      };
      this.currentState = null;
    },

    /**
     * Adds a new state to the possible template forms
     * @param {string} name     Name of template state
     * @param {Function} template Template function
     */
    addState: function(name, template) {
      this.states[name] = template;
    },

    /**
     * Re-renders the current tile with a different template
     * @param  {[type]} name [description]
     * @return {[type]}      [description]
     */
    goToState: function(name) {
      var self = this;
      return new Promise(function(resolve, reject) {
        if (self.name !== self.currentState) {
          self.render(name).then(function() {
            self.trigger('state', name);
          })
          .then(resolve);
        } else {
          resolve();
        }
      });
    },

    /**
     * Returns the tile type, so we can tell diff tiles apart
     * @return {String} Tile type: text.
     */
    type: function() {
      return "text";
    },

    /**
     * Renders the text tile
     * @private
     * @param {string} state The name of template state to go to. Optional.
     * @return {Promise}  Promise
     */
    _render: Promise.method(function(state) {
      if (typeof state === 'undefined' || typeof this.states[state] === 'undefined') {
        state = 'default';
      }
      this.$el.html(this.states[state](this.data));
      this.currentState = state;

      if (this.classname) {
        this.$el.addClass(this.classname);
      }
      return this;
    })
  });
});