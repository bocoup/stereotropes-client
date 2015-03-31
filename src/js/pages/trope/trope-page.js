define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../trope/trope-page');
  var ThumbnailView = require('../../pages/trope/trope-tile');
  var DetailView = require('../../pages/trope/trope-detail-header');
  var Timeline = require('../../pages/trope/trope-overtime-timeline');
  var FilmList = require('../../pages/trope/trope-film-list');
  var _ = require('lodash');
  var Promise = require('bluebird');
  var AdjLine = require('../../pages/trope/trope-adj-ll-scale');

  var GenderBar = require("../../shared/gender-split-bar");

  return View.extend({

    template: template,

    initialize: function(options) {
      var self = this;
      this.options = options;
      this.views = {};

      // bind to winow resize end
      window.addEventListener("resize", _.debounce(function() {
        var timelineContainer = self.$el.find('.trope-timeline-container');
        var adjectiveContainer = self.$el.find('.trope-adjectives-timeline');

        self.views['timeline'].update({ width : timelineContainer.width() });
        self.views['adjs'].update({ width: adjectiveContainer.width() });
      }, 150));
    },

    _remove: function() {
      var self = this;
      self.views['genderbar']._remove();
      return this.views['adjs']._remove().then(function() {
        return Promise.settle(
          self.views['timeline']._remove(),
          self.views['tile']._remove(),
          self.views['details']._remove(),
          self.views['films']._remove());
      });
    },

    _render: function() {
      var self = this;
      this.$el.html(this.template(this.options));

      // thumbnail view
      var thumbnailView = new ThumbnailView({ trope_id : this.options.trope_id });

      // header view
      var detailView = new DetailView({ trope_id : this.options.trope_id });

      // timeline
      var timelineContainer = this.$el.find('.trope-timeline-container');

      var timelineView = new Timeline({
        el : timelineContainer,
        trope_id : this.options.trope_id,
        width : timelineContainer.width(),
        height: 160 / 2
      });

      // gender split bar
      var genderBarView = new GenderBar();

      //adjective triangles
      var adjLine = new AdjLine({
        el : self.$el.find('.trope-adjectives-timeline'),
        trope_id : this.options.trope_id
      });

      //film list
      var filmList = new FilmList({ trope_id : this.options.trope_id });

      this.views['tile'] = thumbnailView;
      this.views['details'] = detailView;
      this.views['timeline'] = timelineView;
      this.views['genderbar'] = genderBarView;
      this.views['adjs'] = adjLine;
      this.views['films'] = filmList;

      return Promise.join(
        thumbnailView.render(),
        detailView.render(),
        adjLine.render(),
        filmList.render(),
        function(t_view, h_view ,a_view, f_view) {

          // we can use the data from the tile view to render
          // the gender bar
          if (t_view.data.gender === 'f') {
            genderBarView.percents({ f : 100, m : 0 });
          } else {
            genderBarView.percents({ f : 0, m : 100 });
          }
          genderBarView.render();

          self.$el.find('.trope-tile-container').append(t_view.$el);
          self.$el.find('.trope-detail-container').append(h_view.$el);
          self.$el.find('.gender-split-bar-container').append(genderBarView.$el);
          self.$el.find('.trope-film-list-container').append(f_view.$el);

          timelineView.render();
          return self;
      });
    }
  });
});
