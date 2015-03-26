define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../tropes/tropes-page');
  var TropeGrid = require('../tropes/trope-grid');

  return View.extend({

    template: template,

    initialize: function(options) {

    },

    _render: function() {
      this.$el.html(this.template());

      this.grid = new TropeGrid({
        el : this.$el.find('.tropes-container')
      });

      return this.grid.render();
    },

    _remove: function() {
      return this.grid._remove();
    }
  });
});