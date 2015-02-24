define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../trope/trope-page');

  return View.extend({

    template: template,

    initialize: function(options) {
      this.options = options;
    },

    draw: function() {
      this.$el.html(this.template(this.options));
      return this;
    }
  });
});