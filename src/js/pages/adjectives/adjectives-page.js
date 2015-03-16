define(function(require) {

  var $ = require('jquery');
  var _ = require('lodash');
  var Promise = require('bluebird');

  var View = require('../../core/view');
  var template = require('tmpl!../adjectives/adjectives-page');
  var DataManager = require('../../data/data_manager');
  var QueryParams = require("../../core/query-data");

  var AdjectiveVis = require('./adjectives-vis');

  var TropeTile = require('../trope/trope-tile');
  var TropeDetails = require('../trope/trope-detail-header');

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

      // Save the original blurb for the page. It will
      // be replaced with trope descriptions at various
      // points and should be restorable.
      this.originalBlurb = $('.blurb').html();

      //Load data and render the visualization
      return DataManager.getAdjectiveNetwork().then(function(adjectiveData){

        var urlSelections = {
          'tropes': QueryParams.get('tropes'),
          'adjectives': QueryParams.get('adjectives'),
        };

        var adjVis = new AdjectiveVis({
          data: adjectiveData,
          container: self.$el.find('.adjectives-page .canvas').get(0),
          selections: urlSelections
        });

        adjVis.on('tropeSelected', function(tropeId){
          self.showTropeDetails(tropeId);
        });

        adjVis.on('adjectiveClicked', function(adjectiveId){
          QueryParams.set('adjectives', adjectiveId);
        });

        adjVis.on('tropeClicked', function(tropeId){
          QueryParams.set('tropes', tropeId);
        });

        adjVis.on('selectionCleared', function(tropeId){
          self.showTropeDetails(null);
          QueryParams.remove('tropes');
          QueryParams.remove('adjectives');
        });

        $(window).resize(function(){
          adjVis.update();
          adjVis.render();
        });

        return adjVis.render();
      });
    },

    /**
     * Show details for a currently selected trope in the area where
     * the page introduction /description was.
     *
     * Restore the original description is trope is deselected.
     * @param  {String} tropeId
     */
    showTropeDetails: function(tropeId) {
      var self = this;

      if(_.isNull(tropeId)){
        var el = $('.blurb');
        if(self.tile && self.tropeDesc){
          Promise.settle([self.tile.remove(), self.tropeDesc.remove()]).then(function(){
            el.html(self.originalBlurb);
          });
        }
      } else {
        DataManager.getTropeDetails(tropeId).then(function(details){
          var el = $('.blurb');

          self.tile = new TropeTile({ trope_id : tropeId });
          self.tropeDesc = new TropeDetails({
            trope_id : tropeId,
            trope_url : '/tropes/' + tropeId,
            same_tab : true
          });

          // var pp = self.tile.render();
          // console.log('trope details promise', pp)
          Promise.settle([self.tile.render(), self.tropeDesc.render()]).then(function(){
            el.empty();
            el.append(self.tile.$el);
            el.append(self.tropeDesc.$el);
          });

        });
      }
    }

  });
});