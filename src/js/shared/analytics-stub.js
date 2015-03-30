// http://veithen.github.io/2015/02/14/requirejs-google-analytics.html
window[window.GoogleAnalyticsObject] = function() {
  console.log("stub");
    for (var i=0; i<arguments.length; i++) {
        var arg = arguments[i];
        if (arg.constructor === Object && arg.hitCallback) {
            arg.hitCallback();
        }
    }
};
