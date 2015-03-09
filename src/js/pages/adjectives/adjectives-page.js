define(function(require) {

  var $ = require('jquery');
  var _ = require('lodash');
  var Promise = require('bluebird');

  var View = require('../../core/view');
  var template = require('tmpl!../adjectives/adjectives-page');
  var DataManager = require('../../data/data_manager');

  var AdjectiveVis = require('./adjectives-vis');

  var TropeTile = require('../trope/trope-tile');
  var TropeDetails = require('../trope/trope-detail-header');




  return View.extend({

    template: template,

    initialize: function(options) {

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

        var adjVis = new AdjectiveVis({
          data: adjectiveData,
          container: self.$el.find('.adjectives-page .canvas').get(0)
        });

        adjVis.on('tropeSelected', function(tropeId){
          self.showTropeDetails(tropeId);
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
          self.tropeDesc = new TropeDetails({ trope_id : tropeId });

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