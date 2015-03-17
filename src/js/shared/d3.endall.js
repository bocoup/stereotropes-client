define(function(require) {
  var d3 = require('d3');

  /**
   * transition function used to catch end of full transition cycle.
   * From: https://groups.google.com/forum/#!msg/d3-js/WC_7Xi6VV50/j1HK0vIWI-EJ
   * @private
   * @param  {d3.selection}   transition Transition selection
   * @param  {Function} callback   Callback function
   */
  d3.transition.prototype.endall = function(callback) {
    var n = 0;
    this.each(function() { ++n; })
        .each("end", function() {
          if (!--n) {
            callback.apply(this, arguments);
          }
        });
  };

});