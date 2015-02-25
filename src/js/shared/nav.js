define(function(require) {

  var View = require('../core/view');
  var template = require('tmpl!../shared/nav');

  return View.extend({
    template: template,
    _render: function() {
      this.$el.html(this.template());
      return this;
    }
  });

});