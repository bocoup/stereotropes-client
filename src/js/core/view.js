define(function(require) {

  var Backbone = require('backbone');
  var Promise = require('bluebird');

  return Backbone.View.extend({

    // default template
    template: '<div></div>',

    /**
     * Wrapped remove method that will call a _remove function if defined,
     * otherwise will just empty the element and kill listeners.
     * @param  {[type]}
     * @return {[type]}
     */
    remove: Promise.method(function() {
      if (this._remove) {
        return this._remove(arguments);
      } else {
        this.$el.empty();
        this.stopListening();
        return this;
      }
    }),

    /**
     * Wrapped render method that will be wrapped in a promise.
     * Expects a ._render method to be defined, will auto wrap it in a promise.
     * @param  ... arguments
     * @return {Promise}
     */
    render : Promise.method(function() {
      if (this._render) {
        return this._render.apply(this,arguments);
      } else {
        this.$el.html(this.template());
        return this;
      }
    })
  });
});