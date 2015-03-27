define(function(require) {
  var FilmList = require('../../shared/film-list');
  var dataManager = require('../../data/data_manager');

  return FilmList.extend({
    initialize: function(options) {
      if (!options.film_id) {
        throw new Error("film id required for rendering film list!");
      }
      this.film_id = options.film_id;
    },
    getData: function() {
      return dataManager.getFilmDetails(this.film_id)
      .then(function(film_data) {
        return film_data.similar;
      });
    }
  });
});
