define(function(require) {
  var _ = require('lodash');
  var FilmList = require('../../shared/film-list');
  var dataManager = require('../../data/data_manager');

  return FilmList.extend({
    initialize: function(options) {
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }
      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;
    },
    getTitle: function() {
      return "films with this trope";
    },
    getData: function() {
      var self = this;
      return dataManager.getTropeDetails(self.trope_id)
      .then(function(trope_details) {
        var ids = [];
        if(trope_details.similar) {
          self.trope_data = trope_details;

          ids = _.chain(trope_details.similar.map(function(s) { return s.films; }))
            .flatten()
            .uniq().slice(0,5).value();
        }
        return ids.map(function(id) { return {id:id}; });
      });
    }
  });
});
