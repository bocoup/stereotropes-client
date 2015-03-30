define(function(require) {

  var Backbone = require('backbone');
  var View = require('../../core/view');
  var template = require('tmpl!../films/films-page');
  var _ = require('underscore');
  var $ = require('jquery');
  var Promise = require('bluebird');
  var QueryParams = require("../../core/query-data");
  var FilmTile = require('../../pages/film/film-tile');
  var dataManager = require('../../data/data_manager');
  var headerTemplate = require("tmpl!../../pages/films/films-page-header");
  var TextTile = require('../../shared/text-tile');
  var Analytics = require("../../shared/analytics");

  var templates = {
    genreTile : require('tmpl!../films/text-tile-filter-genres')
  };

  return View.extend({

    template: template,
    events: {
        "change #genre-selector": "genreSelected"
    },

    initialize: function(options) {
      this.genres = {"all":{name:"All", id:"all"},
                     "action":{name:"Action", id:"action"},
                     "animation":{name:"Animation", id:"animation"},
                     "comedy":{name:"Comedy", id:"comedy"},
                     "drama":{name:"Drama", id:"drama"},
                     "family":{name:"Family", id:"family"},
                     "horror":{name:"Horror", id:"horror"},
                     "musical":{name:"Musical", id:"musical"},
                     "mystery":{name:"Mystery", id:"mystery"},
                     "sci-fi":{name:"Sci-Fi", id:"sci-fi"},
                     "thriller":{name:"Thriller", id:"thriller"},
                     "western":{name:"Western", id:"western"}};

      this.years = {"all":{name:"All", id:"all"},
                     "1910s":{name:"1910s", id:"1910s"},
                     "1920s":{name:"1920s", id:"1920s"},
                     "1930s":{name:"1930s", id:"1930s"},
                     "1940s":{name:"1940s", id:"1940s"},
                     "1950s":{name:"1950s", id:"1950s"},
                     "1960s":{name:"1960s", id:"1960s"},
                     "1970s":{name:"1970s", id:"1970s"},
                     "1980s":{name:"1980s", id:"1980s"},
                     "1990s":{name:"1990s", id:"1990s"},
                     "2010s":{name:"2010s", id:"2010s"},
                     "2000s":{name:"2000s", id:"2000s"}};

    },

    _createSpecialTile: function(genre_key, list, title, tail) {
      var self = this;
      var genreTile = new TextTile({
        data: {"genres":_.values(list), "current_genre":genre_key, "title":title, "tail":tail},
        template: templates.genreTile,
        classname: 'genres'
      });

      genreTile.$el.on('click a', function(ev) {
        var genre_id = $(ev.target).data('genre');
        self.changeGenre(genre_id);
        Analytics.trackEvent("films-page", "filter", genre_id);
        return false;
      });

      return genreTile;

    },
    _createGenreTile: function(genre_key) {
      return this._createSpecialTile(genre_key,this.genres, "Show only ", "films.");
    },
    _createYearTile: function(genre_key) {
      return this._createSpecialTile(genre_key,this.years, "Show films from only the", ".");
    },

    _render: function() {
      var self = this;
      var genre_key =  QueryParams.get('genre');
      self.$el.html(this.template());
      if (!genre_key) {
        genre_key = "all";
      }
      return self.changeGenre(genre_key);
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
        // tiles.unshift(self._createYearTile(genre.id));
        tiles.splice(4,0, self._createYearTile(genre.id));
        tiles.unshift(self._createGenreTile(genre.id));
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
    this.changeGenre(genre_key);
  },
  changeGenre: function(genre_id) {
    QueryParams.set('genre', genre_id);

    // TODO: pretty brittle way
    // to pick the 'genre' now that
    // 'genre' can include regular genres
    // and years
    var genre = {};
    if(_.has(this.genres, genre_id)) {
      genre = this.genres[genre_id];
    } else if(_.has(this.years, genre_id)) {
      genre = this.years[genre_id];
    } else {
      console.log("INVALID GENRE");
      console.log(genre_id);
      return false;
    }
    return this.updateFilms(genre);
  }
  });
});
