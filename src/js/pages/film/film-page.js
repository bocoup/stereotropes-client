define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../film/film-page');
  var ThumbnailView = require('../../pages/film/film-tile');
  var DetailView = require('../../pages/film/film-detail-header');
  var TropesListView = require('../../pages/film/film-tropes-list');
  var Promise = require('bluebird');

  return View.extend({

    template: template,

    initialize: function(options) {
      this.options = options;
      this.views = {};
    },

    _render: function() {
      var self = this;
      this.$el.html(this.template(this.options));

      // thumbnail view
      var thumbnailView = new ThumbnailView({ film_id : this.options.film_id });

      // header view
      var detailView = new DetailView({ film_id : this.options.film_id });

      // tropes list view
      var tropesListContainer = self.$el.find('.film-tropes-list-container');

      var tropesListView = new TropesListView({ 
        film_id : this.options.film_id,
        width : tropesListContainer.width()
      });

      this.views['tile'] = thumbnailView;
      this.views['details'] = detailView;
      this.views['tropes'] = tropesListView;

      return Promise.join(thumbnailView.render(), detailView.render(), tropesListView.render(), function(t_view, h_view, t_l_view) {
        self.$el.find('.film-tile-container').append(t_view.$el);
        self.$el.find('.film-detail-container').append(h_view.$el);
        self.$el.find('.film-tropes-list-container').append(t_l_view.$el);
        return self;
      });
    }
  });
});
