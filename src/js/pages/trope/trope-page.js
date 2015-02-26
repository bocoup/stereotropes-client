define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../trope/trope-page');
  var ThumbnailView = require('../../pages/trope/trope-tile');
  var HeaderView = require('../../pages/trope/trope-detail-header');
  var Timeline = require('../../pages/trope/trope-overtime-timeline');

  var Promise = require('bluebird');

  return View.extend({

    template: template,

    initialize: function(options) {
      this.options = options;
      this.views = [];
    },

    _render: function() {
      var self = this;
      this.$el.html(this.template(this.options));

      // thumbnail view
      var thumbnailView = new ThumbnailView({ trope_id : this.options.trope_id });

      // header view
      var headerView = new HeaderView({ trope_id : this.options.trope_id });

      // timeline
      var timelineContainer = self.$el.find('.trope-timeline-container');
      var timelineView = new Timeline({
        el : timelineContainer,
        trope_id : this.options.trope_id,
        width : timelineContainer.width(),
        height: 160 / 2
      });

      this.views.push(thumbnailView, headerView);
      return Promise.join(thumbnailView.render(), headerView.render(), function(t_view, h_view) {
        self.$el.find('.trope-tile-container').append(t_view.$el);
        self.$el.find('.trope-detail-container').append(h_view.$el);
        timelineView.render();
        return self;
      });
    }
  });
});