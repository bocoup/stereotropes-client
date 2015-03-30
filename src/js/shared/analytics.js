define(function(require) {
  var ga = require('ga');
  function Analytics(options){
    options = options || {};

    ga(function() {
      console.log('ga done loading');
    });
  }

  Analytics.prototype.trackPage = function(page) {
    ga("send", "pageview", page);
  };

  Analytics.prototype.trackEvent = function(category, action, label, count) {
  };

  // Return an instance so that this module is effectively
  // a singleton providing a single source of truth.
  //
  // With require.js semantics this will also be run once so all
  // requires of this module will get this one instance.
  return new Analytics();

});
