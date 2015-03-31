define(function(require) {
  var View = require("../core/view");
  var template = require("tmpl!../shared/gender-split-bar");
  var Promise = require('bluebird');

  return View.extend({

    /**
     * Sets up a gender bar
     * @constructor
     * @param  {Object} [options] Optional arguments
     * @param {Object} [options.percents] Percents breakdown
     * @param {Object} [options.percents.f] Percent female
     * @param {Object} [options.percents.m] Percent male
     */
    initialize: function(options) {
      options = options || {};
      if (options.percents) {
        this.p = options.percents;
      } else {
        this.p = { m : 50, f : 50 };
      }
    },

    /**
     * Overwrite this with your method for getting data.
     * It must be returned in the form of percents above.
     * It must return a promise
     * @abstract
     * @return {Promise} Promise
     */
    _getData: function() {
      return new Promise(function(resolve, reject) {
        resolve(); // pass by default
      });
    },

    /**
     * Getter/Setter for percents
     * @param {Object} [percents] Optional. Percentages for m/f.
     * @return {Object} Current percents
     */
    percents: function() {
      if (arguments.length) {
        this.p = arguments[0];
      }
      return this.p;
    },

    /**
     * Just renders ther bar.
     * @return {View} View instance
     */
    _preDataRender: function() {
      this.$el.html(template({ percents : this.p }));
      return this;
    },

    /**
     * Renders the bar
     * @return {Promise} Promise
     */
    _render: Promise.method(function() {
      var self = this;
      return this._getData().then(function() {
        return self._preDataRender();
      });
    }),

    _remove: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.$el.fadeOut(200, resolve);
      });
    }
  });
});