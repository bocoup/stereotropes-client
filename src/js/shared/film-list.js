define(function(require) {
  var Backbone = require('backbone');
  var FilmTile = require('../pages/film/film-tile');
  var _ = require('lodash');
  var View = require('../core/view');
  var dataManager = require('../data/data_manager');
  var template = require('tmpl!../shared/film-list');
  var Promise = require('bluebird');

  return View.extend({
    template: template,
    className: 'films',
    initialize: function(options) {
    },
    getTitle: function() {
      return "";
    },
    getData: function() {
      var self = this;
      return dataManager.getTropeDetails(self.trope_id)
      .then(function(trope_details) {
        var films = _.chain(trope_details.similar.map(function(s) { return s.films; }))
        .flatten()
        .uniq().slice(0,5).value();
        return films;
      });
    },
    _render: function() {
      var self = this;
      return self.getData().then(function(film_data) {
        return film_data.map(function(data) { return new FilmTile(data); });
      })
      .then(function(tiles) {
        return Promise.all(tiles.map(function(t) { return t.render(); }));
      })
      .then(function(tiles) {
        return tiles.filter(function(t) { return t.found(); });
      })
      .then(function(tiles) {
        if (tiles.length > 0) {
          self.$el.html(self.template({"title": self.getTitle()}));
        }
        tiles.forEach(function(tile, index) {
          tile.on("film-select", function(id) {
            Backbone.history.navigate('/films/' + id, { trigger: true });
          });
          self.$el.find('.film-tiles-container').append(tile.$el);
          tile.show(5);
          return self;
        });
        return self;
      });
    },
    _remove: Promise.method(function() {
      return this.$el.fadeOut().empty();
    })
  });
});
