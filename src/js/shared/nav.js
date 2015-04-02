define(function(require) {

  var View = require('../core/view');
  var template = require('tmpl!../shared/nav');
  var Analytics = require("../shared/analytics");

  function unCamelCase(s) {
    // insert a space before all caps
    return s.replace(/([A-Z])/g, ' $1')
      // uppercase the first character
      .replace(/^./, function(str){ return str.toUpperCase(); });
  }
  return View.extend({
    template: template,

    events: {
      'click #pull' : 'showMenu',
      'click ul li a' : 'hideMenu',
    },

    _render: function() {
      this.$el.html(this.template());
      return this;
    },

    /**
     * Update the selected page in the nav item.
     * @param  {String} name Name of page to go to
     * @return {View instance} Instance of nav.
     */
    page: function(name, options) {
      this.$el.find('.inactive').removeClass('inactive');
      var el = this.$el.find('a[data-name=' + name + ']')
        .addClass('inactive');
      if (el.size()) {
        document.title = "Stereotropes - " + name;
      } else if (name === 'film') {
        document.title = "Stereotropes - " + unCamelCase(options.film_id);
      } else if (name === 'trope') {
        document.title = "Stereotropes - " + unCamelCase(options.trope_id);
      } else {
        document.title = "Stereotropes";
      }
      return this;
    },
    showMenu: function(e) {
      var menu = this.$el.find("ul");
      // var menuHeight = menu.height();
      e.preventDefault();
      menu.slideToggle();
      this.$el.find("#pull .site-title").toggle();
      Analytics.trackEvent("nav", "menu", "show");
      return false;
    },

    hideMenu: function(e) {
      var pull = this.$el.find("#pull");
      if(pull.is(':visible')) {

        var menu = this.$el.find("ul");
        menu.slideToggle();
        this.$el.find("#pull .site-title").show();
      }
    }

  });

});
