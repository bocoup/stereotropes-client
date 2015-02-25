define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../films/films-page');

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