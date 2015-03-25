define(function(require) {

  var Backbone = require('backbone');
  var View = require('../../core/view');
  var template = require('tmpl!../films/films-page');
  var _ = require('underscore');
  var Promise = require('bluebird');
  var QueryParams = require("../../core/query-data");
  var FilmTile = require('../../pages/film/film-tile');
  var dataManager = require('../../data/data_manager');
  var selectTemplate = require("tmpl!../../pages/films/films-select");
  var headerTemplate = require("tmpl!../../pages/films/films-page-header");

  return View.extend({

    template: template,
    events: {
        "change #genre-selector": "genreSelected"
    },

    initialize: function(options) {
      this.genres = {"all":{name:"All", id:"all"},
                     "action":{name:"Action", id:"action"},
                     "comedy":{name:"Comedy", id:"comedy"},
                     "drama":{name:"Drama", id:"drama"},
                     "sci-fi":{name:"Sci-Fi", id:"sci-fi"},
                     "thriller":{name:"Thriller", id:"thriller"},
                     "western":{name:"Western", id:"western"}};
    },

    _render: function() {
      var self = this;
      var genre_key =  QueryParams.get('genre');
      if (!genre_key) {
        genre_key = "all";
      }
      self.$el.html(this.template());
      self.$el.find(".films-select-container")
        .html(selectTemplate({"genres":_.values(self.genres)}));
      // TODO: better way to set current selection?
      self.$el.find("#genre-selector").val(genre_key);

      return self.updateFilms(self.genres[genre_key]);
    },
  /**
   * updateFilms - updates films list based on genre
   * selected
   *
   * @param genre
   * @return {promise}
   */
  updateFilms: function(genre) {
    var self = this;
    self.$el.find(".film-tiles-container").html("");
    self.$el.find(".films-page-header-container")
      .html(headerTemplate({"genre": genre}));

    return dataManager.getTopFilms(genre.id)
      .then(function(shownFilms) {
        return shownFilms.map(function(f) { return new FilmTile(f); });
      })
      .then(function(tiles) {
        return Promise.all(tiles.map(function(t) { return t.render(); }));
      })
      .then(function(tiles) {
        tiles.forEach(function(tile, index) {
          if(tile.found()) {
            tile.on("film-select", function(id) {
              Backbone.history.navigate('/films/' + id, { trigger: true });
            });
            self.$el.find('.film-tiles-container').append(tile.$el);
            tile.$el.hide().delay(index * 80).fadeIn(600);
          }
          return self;
        });

    });
  },
  genreSelected: function(e) {
    var genre_key = this.$("#genre-selector").val();
    QueryParams.set('genre', genre_key);
    return this.updateFilms(this.genres[genre_key]);
  }
  });
});
