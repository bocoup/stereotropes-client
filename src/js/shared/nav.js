define(function(require) {

  var View = require('../core/view');
  var template = require('tmpl!../shared/nav');

  return View.extend({
    template: template,

    _render: function() {
      this.$el.html(this.template());
      return this;
    },

    /**
     * Update the selected page in the nav item.
     * @param  {String} name Name of page to go to
     * @return {View instance} Instance of nav.
     */
    page: function(name) {
      this.$el.find('.inactive').removeClass('inactive');
      this.$el.find('a[data-name=' + name + ']')
        .addClass('inactive');
      return this;
    }

  });

});