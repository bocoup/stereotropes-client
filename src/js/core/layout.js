define(function(require) {

  var View = require('../core/view');
  var template = require('tmpl!../core/layout');

  return View.extend({
    template: template,

    draw: function() {
      this.$el.html(this.template());
      return this;
    }

  });

});