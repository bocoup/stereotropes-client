define(function(require) {

  var Promise = require('bluebird');
  var $ = require('jquery');
  var View = require('../core/view');
  var Bloodhound = require('bloodhound');

  // js hint gives an error for not using typeahead
  // but we need it to be required to bring in the
  // typeahead jquery plugin - so ignore the line.
  var typeahead = require('typeahead'); // jshint ignore:line

  var dataManager = require('../data/data_manager');

  var template = require('tmpl!../shared/search');

  return View.extend({

    template: template,
    events: {
      'focus .typeahead' : 'onFocus',
      'typeahead:selected .typeahead' : 'onSelected'
    },

    /**
     * _render - display the search
     *
     * @return {Promise[Object]} promise that enables typeahead
     */
    _render: function() {
      this.$el.html(this.template());
      var self = this;
      return Promise.join(dataManager.getTropes(), dataManager.getFilms(), function(tropesData, filmsData) {
        self.typeahead(tropesData, filmsData);
        return self;
      });
    },

    /**
     * typeahead
     *
     * @param tropesData - data from DataManager that has all tropes
     * @param filmsData - data from DataManager that has all films
     * @return {undefined}
     */
    typeahead: function(tropesData, filmsData) {

      var films = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: filmsData
      });

      films.initialize();

      var tropes = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: tropesData
      });

      tropes.initialize();

      $('.typeahead').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
      },
      {
        name: 'tropes',
        displayKey: 'name',
        source: tropes.ttAdapter(),
        templates: {
          header: '<h3 class="search-name">Tropes</h3>'
        }
      },
      {
        name: 'films',
        displayKey: 'name',
        source: films.ttAdapter(),
        templates: {
          header: '<h3 class="search-name">Films</h3>'
        }
      });
    },

    /**
     * onSelected
     *
     * Called when suggestion from dropdown list is called
     * this will trigger an event on
     *
     * @param el - element selected
     * @param suggestion - data for element clicked on
     * @param source - data source ('films' or 'tropes'
     * @return {undefined}
     */
    onSelected: function(el, suggestion, source) {
      this.$el.find('.typeahead').blur();
      this.trigger('search:selected', {"id":suggestion.id, "type":source});
    }
  });
});
