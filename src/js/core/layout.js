define(function(require) {

  var Backbone = require('backbone');
  var template = require('tmpl!../core/layout');

  return Backbone.View.extend({
    template: template,

    render: function() {
      this.$el.html(this.template());
      return this;
    }

  });

});