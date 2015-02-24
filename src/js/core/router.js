define(function(require) {

  var Backbone = require('backbone');
  var Util = require('../core/util');

  var Layout = require('../core/layout');
  var layout = new Layout({
    el: "#main"
  });

  var Router = Backbone.Router.extend({

    routes: {
      "": "tropes",
      "trope/:trope_id" : "trope",
      "films": "films",
      "film/:film_id" : "film",
      "adjectives": "adjectives",
      "gender" : "gender",
      "about" : "about"
    /**
     * Overwrite default route execution to parse out query strings.
     * @param  {Function} callback
     * @param  {[Object]} arguments
     */
    execute: function(callback, args) {
      // extract params
      var params = Util.decodeQueryParams();
      args.pop(); // remove the null at the end.
      args.push(params);
      if (callback) {
        callback.apply(this, args);
      }
    },

    initialize: function() {

      // TODO: set up all data fetching here
      // and then render the layout when the data is ready.
      layout.render();

      // TODO: Set up some event bus to pass into the layout.
    },

    /**
     * Index route - Trope Grid
     */
    tropes: function() {

    },

    /**
     * Individual Trope page
     * @param  {String} trope_id
     */
    trope: function(trope_id) {

    },

    /**
     * Films grid page
     */
    films: function() {

    },

    /**
     * Individual Film page
     * @param  {String} film_id
     */
    film: function(film_id) {

    },

    /**
     * Adjectives wheel page
     */
    adjectives: function() {

    },

    /**
     * Gender split page
     */
    gender: function() {

    },

    /**
     * About page
     */
    about: function() {

    }

  });

  return Router;
});
