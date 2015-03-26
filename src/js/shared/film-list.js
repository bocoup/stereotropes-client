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
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }

      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;
    },
    getData: function() {
      var self = this;
      return dataManager.getTropeDetails(self.trope_id)
      .then(function(trope_details) {
        self.trope_data = trope_details;
        self.$el.html(self.template(self.trope_data));
        var films = _.chain(trope_details.similar.map(function(s) { return s.films; }))
        .flatten()
        .uniq().slice(0,5).value();
        return films;
      });
    },
    _render: function() {
      var self = this;
      return self.getData().then(function(ids) {
        return ids.map(function(f) { return new FilmTile({id:f}); });
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
        });
        return self;
      });
    }
  });
});
