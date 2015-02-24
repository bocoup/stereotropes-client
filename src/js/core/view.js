define(function(require) {

  var Backbone = require('backbone');
  var Promise = require('bluebird');

  return Backbone.View.extend({

    // default template
    template: '<div></div>',

    /**
     * Wrapped remove method that will call a destroy function if defined,
     * otherwise will just empty the element and kill listeners.
     * @param  {[type]}
     * @return {[type]}
     */
    remove: Promise.method(function() {
      if (this.destroy) {
        return this.destroy(arguments);
      } else {
        this.$el.empty();
        this.stopListening();
        return this;
      }
    }),

    /**
     * Wrapped render method that will be wrapped in a promise.
     * Expects a .draw method to be defined, will auto wrap it in a promise.
     * @param  ... arguments
     * @return {Promise}
     */
    render : Promise.method(function() {
      if (this.draw) {
        return this.draw(arguments);
      } else {
        this.$el.html(this.template());
        return this;
      }
    })
  });
});