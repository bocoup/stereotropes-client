define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../about/about-page');
  var Analytics = require("../../shared/analytics");

  return View.extend({

    template: template,

    events: {
      'click a.pk' : 'trackPK'
    },

    initialize: function(options) {

    },

    trackPK: function() {
      Analytics.trackEvent("about-page", "press-kit");
    },

    _render: function() {
      this.$el.html(this.template());
      return this;
    }
  });
});