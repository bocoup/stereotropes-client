window.GoogleAnalyticsObject = "__ga__";
window[window.GoogleAnalyticsObject] = {
    l: Date.now()
};

define(function() {

  var q = window[window.GoogleAnalyticsObject].q = [];

  // require asynchronously. We don't want the rest of our code
  // dependent on google analytics loading. By utilizing the global
  // require (note that we are not passing 'require' to the define call)
  // we can invoke an async load of the analytics.
  require(['//www.google-analytics.com/analytics.js']);

  // elsewhere (in analytics):
  // var ga = require('ga-stub');
  // ga("create", "UA-19937033-1", "auto")
  return function() {
    if (typeof window[window.GoogleAnalyticsObject] === 'function') {
      return window[window.GoogleAnalyticsObject].apply(this, arguments);
    }
    q.push(arguments);
  };
});