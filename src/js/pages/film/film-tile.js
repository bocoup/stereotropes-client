define(function(require) {
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../film/film-tile');
  var Promise = require('bluebird');
  var _ = require('underscore');

  return View.extend({
    template : template,

    className : 'film-tile',

    initialize: function(options) {
      if (!options.film_id) {
        throw new Error("Film id required for rendering film tile!");
      }

      this.film_data = {
        loading : true,
        url_root: "/assets/data/films/posters/"
      };

      this.film_id = options.film_id;
    },

    _preDataRender: function() {
      this.$el.html(this.template(this.film_data));
      return this;
    },

    _render: function() {
      var self = this;
      this._preDataRender();

      return dataManager.getFilmDetails(this.film_id).then(function(film_details) {
        self.film_data = _.extend(film_details, self.film_data);
        self.film_data.loading = false;

        self.$el.html(self.template(self.film_data));
        return self;
      });
    },

    _remove: Promise.method(function() {
      return this.$el.fadeOut().empty();
    })
  });
});
