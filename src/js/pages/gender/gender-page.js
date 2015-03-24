define(function(require) {

  var $ = require('jquery');
  var _ = require('lodash');
  var View = require('../../core/view');
  var template = require('tmpl!../gender/gender-page');

  var DataManager = require('../../data/data_manager');
  var QueryParams = require("../../core/query-data");

  var GenderSplitVis = require('./gender-split-vis');

  return View.extend({

    template: template,

    initialize: function(options) {

    },

    _render: function() {
      var self = this;

      //Set up the initial template
      this.$el.html(this.template());

      //Load data and render the visualization
      return DataManager.getGenderSplits().then(function(genderSplitData){

        var urlSelections = {
          'adjectives': QueryParams.get('adjectives'),
        };

        var genderSplitVis = new GenderSplitVis({
          data: genderSplitData,
          container: self.$el.find('.gender-page .canvas').get(0),
          selections: urlSelections
        });

        var resize = function(){
          genderSplitVis.update();
          genderSplitVis.render();
        };

        $(window).resize(_.debounce(resize, 50));

        return genderSplitVis.render();
      });
    }
  });
});