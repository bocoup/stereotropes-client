define(function(require) {

  var View = require('../../core/view');
  var template = require('tmpl!../adjectives/adjectives-page');
  var DataManager = require('../../data/data_manager');

  var AdjectiveVis = require('./adjectives-vis');
  console.log('AdjectiveVis', AdjectiveVis);

  return View.extend({

    template: template,

    initialize: function(options) {
      console.log('adj page initialize');
    },

    _render: function() {
      var self = this;

      //Set up the initial template
      this.$el.html(this.template());

      //Load data and render the visualization
      return DataManager.getAdjectiveNetwork().then(function(adjectiveData){
        console.log('data is here', adjectiveData);

        var adjVis = new AdjectiveVis({
          data: adjectiveData,
          container: self.$el.find('.adjectives-page').get(0)
        });

        adjVis.update();
        return adjVis.render();
      });

    }
  });
});