define(function(require) {
  var ga = require('../shared/ga-stub');
  ga("create", "UA-61343354-1", "auto");

  function Analytics(options){
    options = options || {};
  }

  Analytics.prototype.trackPage = function(page) {
    ga("send", "pageview", page);
  };

  Analytics.prototype.trackEvent = function(category, action, label) {
    ga("send", "event", category, action, label);
  };

  Analytics.prototype.trackError = function(message) {
    console.log("logging exception: " + message);
    ga("send", "exception", message);
  };

  // Return an instance so that this module is effectively
  // a singleton providing a single source of truth.
  //
  // With require.js semantics this will also be run once so all
  // requires of this module will get this one instance.
  return new Analytics();

});
