define(function(require) {

  var View = require('../core/view');
  var Nav = require('../shared/nav');

  var template = require('tmpl!../core/layout');

  return View.extend({
    template: template,

    draw: function() {
      this.$el.html(this.template());

      // add navigation bar
      this.nav = new Nav({
        el : this.$el.find('nav')
      });

      this.nav.render();

      return this;
    }

  });

});