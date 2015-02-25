define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../tropes/tropes-page');

  return View.extend({

    template: template,

    initialize: function(options) {

    },

    _render: function() {
      this.$el.html(this.template());
      return this;
    }
  });
});