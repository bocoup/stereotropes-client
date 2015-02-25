define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../adjectives/adjectives-page');

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