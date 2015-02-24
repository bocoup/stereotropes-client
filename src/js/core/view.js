define(function(require) {

  var Backbone = require('backbone');
  var Promise = require('bluebird');

  return Backbone.View.extend({

    // default template
    template: '<div></div>',

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