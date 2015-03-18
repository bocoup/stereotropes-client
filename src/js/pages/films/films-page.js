define(function(require) {

  var Backbone = require('backbone');
  var View = require('../../core/view');
  var template = require('tmpl!../films/films-page');
  var _ = require('underscore');
  var Promise = require('bluebird');
  var FilmTile = require('../../pages/film/film-tile');
  var dataManager = require('../../data/data_manager');

  return View.extend({

    template: template,

    initialize: function(options) {
    },

    _render: function() {
      var self = this;
      self.$el.html(this.template());
      return dataManager.getFilms().then(function(allFilms) {
        var shownFilms = _.sample(allFilms, 45);
        var tiles = shownFilms.map(function(f) { return new FilmTile({film_id : f.id}); });
        Promise.all(tiles.map(function(t) { return t.render(); })).then(function(tiles) {
          tiles.forEach(function(tile) {
            if(tile.found()) {
            tile.on("film-select", function(id) {
              Backbone.history.navigate('/films/' + id, { trigger: true });
            });
            self.$el.find('.film-tiles-container').append(tile.$el);
            }
          });
        });
      });
    }
  });
});
