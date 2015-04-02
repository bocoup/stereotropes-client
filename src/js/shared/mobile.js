define(function(require) {

  var $ = require('jquery');
  var _ = require('lodash');
  var reset = true;
  var results = {
    small: false,
    medium: false,
    large: false,
    xlarge: true
  };

  // when window resizes, recompute the things,
  // then reset back to false, so that we don't do the
  // modernizer tests again unless we have to.
  $(window).on('resize', _.debounce(function() {
    reset = true;
    isSmall();
    isMedium();
    isLarge();
    isXLarge();
    reset = false;
  }, 50));

  // check if we're on small screens (mobile)
  var isSmall = function() {
    if (reset) {
      results.small = Modernizr.mq("only all and (max-width: 568px)");
    }
    return results.small;
  };

  // check if we're on medium screens (tablet)
  var isMedium = function() {
    if (reset) {
      results.medium = Modernizr.mq("only all and (min-width: 569px) and (max-width: 768px)");
    }
    return results.medium;
  };

  // check if we're on large screens (web)
  var isLarge = function() {
    if (reset) {
      results.large = Modernizr.mq("only all and (min-width: 769px) and (max-width: 1024px)");
    }
    return results.large;
  };

  // check if we're on large screens (web)
  var isXLarge = function() {
    if (reset) {
      results.xlarge = Modernizr.mq("only all and (min-width: 1025px)");
    }
    return results.xlarge;
  };

  // set up initial values:
  isSmall();
  isMedium();
  isLarge();
  isXLarge();

  // turn on caching until there's a resize.
  reset = false;

  return {
    small : function() {
      return isSmall();
    },
    medium: function() {
      return isMedium();
    },
    large: function() {
      return isLarge();
    },
    xlarge: function() {
      return isXLarge();
    },
    touch : function() {
      return Modernizr.touch;
    }
  };
});
