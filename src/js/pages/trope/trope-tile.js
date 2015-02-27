define(function(require) {
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var template = require('tmpl!../trope/trope-tile');
  var Promise = require('bluebird');

  return View.extend({
    template : template,

    className : 'trope-tile',

    initialize: function(options) {
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }

      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;
    },

    _preDataRender: function() {
      this.$el.html(this.template(this.trope_data));
      return this;
    },

    _render: function() {
      var self = this;
      this._preDataRender();

      return dataManager.getTrope(this.trope_id).then(function(trope_details) {
        self.trope_data = trope_details;
        self.trope_data.loading = false;

        // set gender class on container
        self.$el.addClass('gender-' + self.trope_data.gender);

        self.$el.html(self.template(self.trope_data));
        return self;
      });
    },

    _remove: Promise.method(function() {
      return this.$el.fadeOut().empty();
    })
  });
});