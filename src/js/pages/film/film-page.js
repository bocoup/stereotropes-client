define(function(require) {

  var View = require('../../core/view');
  var _  = require("lodash");
  var template = require('tmpl!../film/film-page');
  var dataManager = require('../../data/data_manager');
  var ThumbnailView = require('../../pages/film/film-tile');
  var DetailView = require('../../pages/film/film-detail-header');
  var TropesListView = require('../../pages/film/film-tropes-list');
  var FilmList = require('../../pages/film/film-film-list');
  var Promise = require('bluebird');
  var Analytics = require("../../shared/analytics");

  return View.extend({

    template: template,

    initialize: function(options) {
      var self = this;
      this.options = options;
      this.views = {};
      window.addEventListener("resize", _.debounce(function() {
        var tropesListContainer = self.$el.find('.film-tropes-list-container');
        self.views['tropes'].resize({width: tropesListContainer.width()});
        Analytics.trackEvent("film-page", "resize");
      }, 150));
    },

    _render: function() {
      var self = this;
      this.$el.html(this.template(this.options));

      // thumbnail view
      var thumbnailView = new ThumbnailView({ id : this.options.film_id });

      // header view
      var detailView = new DetailView({ film_id : this.options.film_id });

      // tropes list view
      var tropesListContainer = self.$el.find('.film-tropes-list-container');

      var tropesListView = new TropesListView({
        film_id : this.options.film_id,
        width : tropesListContainer.width()
      });

      // similar film list
      var filmList = new FilmList({ film_id : this.options.film_id });

      this.views['tile'] = thumbnailView;
      this.views['details'] = detailView;
      this.views['tropes'] = tropesListView;
      this.views['films'] = filmList;

      // need to do this before render to get bounding boxes
      self.$el.find('.film-tropes-list-container').append(tropesListView.$el);

      return dataManager.getFilmDetails(this.options.film_id).then(function(film_details) {
          return Promise.join(thumbnailView.render(), detailView.render(), tropesListView.render(), filmList.render(), function(t_view, h_view, t_l_view, f_view) {
            self.$el.find('.film-tile-container').append(t_view.$el);
            self.$el.find('.film-detail-container').append(h_view.$el);
            self.$el.find('.film-film-list-container').append(f_view.$el);
            return self;
          });
      }).catch(function(e) {
        Analytics.trackError(e.responseText);
        var errorTemplate = require('tmpl!../film/error');
        self.$el.html(errorTemplate());

      });
    }
  });
});
