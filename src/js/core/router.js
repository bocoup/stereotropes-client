define(function(require) {

  var Backbone = require('backbone');
  var Util = require('../core/util');

  var Layout = require('../core/layout');
  var layout = new Layout({
    el: "#main"
  });


  var Router = Backbone.Router.extend({

    routes: {
      "(?*qs)": "tropes",
      "tropes/:trope_id(?*qs)" : "trope",
      "films(?*qs)": "films",
      "films/:film_id(?*qs)" : "film",
      "adjectives(?*qs)": "adjectives",
      "gender(?*qs)" : "gender",
      "about(?*qs)" : "about"
    },

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
     * Trope index page
     * @param  {String} qs Raw query string
     * @param  {Object} params Parsed query string
     */
    tropes: function(qs, params) {
      layout.page('tropes', {}, params );
    },

    /**
     * Individual Trope page
     * @param  {String} trope_id
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    trope: function(trope_id, qs, params) {
      layout.page('trope', { trope_id : trope_id }, params);
    },

    /**
     * Films grid page
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    films: function(qs, params) {
      layout.page('films', {}, params);
    },

    /**
     * Individual Film page
     * @param  {String} film_id
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    film: function(film_id, qs, params) {
      layout.page('film', { film_id : film_id }, params);
    },

    /**
     * Adjectives wheel page
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    adjectives: function(qs, params) {
      layout.page('adjectives', {}, params);
    },

    /**
     * Gender split page
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    gender: function(qs, params) {
      layout.page('gender', {}, params);
    },

    /**
     * About page
     * @param {[String]} qs Raw query string
     * @param {[Object]} params Parsed query string
     */
    about: function(qs, params) {
      layout.page('about', {}, params);
    }

  });

  return Router;
});
