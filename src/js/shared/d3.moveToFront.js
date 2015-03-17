define(function(require) {

  var d3 = require('d3');

  /**
   * Moves a d3 selection to the top of its parent container.
   * Useful to unhide things.
   * @return {d3.selection}
   */
  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };

});