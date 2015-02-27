define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../film/film-page');
  var ThumbnailView = require('../../pages/film/film-tile');
  var DetailView = require('../../pages/film/film-detail-header');
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

      this.views['tile'] = thumbnailView;
      this.views['details'] = detailView;

      return Promise.join(thumbnailView.render(), detailView.render(), function(t_view, h_view) {
        self.$el.find('.film-tile-container').append(t_view.$el);
        self.$el.find('.film-detail-container').append(h_view.$el);
        return self;
      });
    }
  });
});
