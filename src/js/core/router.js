define(function(require) {

  var Backbone = require('backbone');

  var Layout = require('../core/layout');
  var layout = new Layout({
    el: "#main"
  });

  var Router = Backbone.Router.extend({

    routes: {
      "": "index"
    },

    initialize: function() {

      // TODO: set up all data fetching here
      // and then render the layout when the data is ready.
      layout.render();

      // TODO: Set up some event bus to pass into the layout.
    },

    index: function() {

    }

  });

  return Router;
});
