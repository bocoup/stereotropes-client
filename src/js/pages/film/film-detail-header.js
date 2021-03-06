define(function(require) {
  var View = require('../../core/view');
  var _ = require('lodash');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../film/film-detail-header');
  var Promise = require('bluebird');

  return View.extend({
    template: template,
    className: 'details',

    initialize: function(options) {
      if (!options.film_id) {
        throw new Error("Film id required for rendering Film tile!");
      }

      this.film_data = {
        loading : true
      };

      if (options.film_url) {
        this.film_data.film_url = options.film_url;
      } else {
        this.film_data.film_url = "http://tvtropes.org/pmwiki/pmwiki.php/Main/" + options.film_id;
      }

      this.film_data.url_target = "_blank";

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
        _.merge(self.film_data, film_details);
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
