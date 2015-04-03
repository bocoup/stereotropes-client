define(function(require) {

  var $ = require('jquery');
  var Backbone = require('backbone');

  var View = require('../../core/view');
  var template = require('tmpl!../adjectives/adjectives-page');
  var DataManager = require('../../data/data_manager');
  var QueryParams = require("../../core/query-data");

  var AdjectiveVis = require('./adjectives-vis');

  return View.extend({

    template: template,

    initialize: function(options, params) {
      this.options = options;
      this.params = params;
    },

    _render: function() {
      var self = this;

      //Set up the initial template
      this.$el.html(this.template());

      // If the canvas is hidden (e.g. on mobile) do not load data
      // or render the vis.
      if(!($('.canvas').is(":visible"))){
        return;
      }

      //Load data and render the visualization
      return DataManager.getAdjectiveNetwork().then(function(adjectiveData){

        var urlSelections = {
          'adjectives': QueryParams.get('adjectives')
        };

        var adjVis = new AdjectiveVis({
          data: adjectiveData,
          container: self.$el.find('.adjectives-page .canvas').get(0),
          selections: urlSelections
        });

        adjVis.on('adjectiveClicked', function(adjectiveId){
          QueryParams.set('adjectives', adjectiveId);
        });

        adjVis.on('tropeClicked', function(tropeId){
          if(tropeId) {
            Backbone.history.navigate('/tropes/' + tropeId, true);
          }
        });

        adjVis.on('selectionCleared', function(tropeId){
          QueryParams.remove('adjectives');
        });

        $(window).resize(function(){
          adjVis.update();
          adjVis.render();
        });

        return adjVis.render();
      });
    },


  });
});