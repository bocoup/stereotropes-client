define(function(require) {
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../trope/trope-detail-header');
  var Promise = require('bluebird');

  return View.extend({
    template: template,
    className: 'details',

    initialize: function(options) {
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }

      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;

      if (options.trope_url) {
        this.trope_url = options.trope_url;
      } else {
        this.trope_url = "http://tvtropes.org/pmwiki/pmwiki.php/Main/" + this.trope_id;
      }

      this.same_tab = options.same_tab;
    },

    _preDataRender: function() {
      this.$el.html(this.template(this.trope_data));
      return this;
    },

    _render: function() {
      var self = this;
      this._preDataRender();

      return dataManager.getTropeDetails(this.trope_id).then(function(trope_details) {
        self.trope_data = trope_details;
        self.trope_data.loading = false;
        self.trope_data.trope_url = self.trope_url;
        self.trope_data.url_target = (self.same_tab ? '' : '_blank');
        self.$el.html(self.template(self.trope_data));
        return self;
      });
    },

    _remove: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.$el.fadeOut(200, resolve);
      });
    }

  });
});