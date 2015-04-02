define(function(require) {
  var maxMobileWidth = 500;
  return {
    small : function(width) {
      return (width < maxMobileWidth);
    },
    mobile : function(width) {
      return (Modernizr.touch || this.small(width));
    }
  };
});
