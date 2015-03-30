define(function(require) {

  var Promise = require('bluebird');
  var $ = require('jquery');
  var View = require('../core/view');
  var Bloodhound = require('bloodhound');
  var Analytics = require("../shared/analytics");

  // js hint gives an error for not using typeahead
  // but we need it to be required to bring in the
  // typeahead jquery plugin - so ignore the line.
  var typeahead = require('typeahead'); // jshint ignore:line
  var dataManager = require('../data/data_manager');
  var templates = {
    main : require('tmpl!../shared/search'),
    films_header : require('tmpl!../shared/search-films-header'),
    tropes_header : require('tmpl!../shared/search-tropes-header'),
    tropes_suggestion : require('tmpl!../shared/search-tropes-suggestion')
  };

  return View.extend({

    template: templates.main,
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
        datumTokenizer: function(datum) {
          // adjs are already in an array - so just join with the name tokenizer
          return Bloodhound.tokenizers.obj.whitespace('name')(datum).concat(datum.adjs);
        },
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
          header: templates.tropes_header(),
          suggestion: function(trope) {
            return templates.tropes_suggestion(trope);
          }
        }
      },
      {
        name: 'films',
        displayKey: 'name',
        source: films.ttAdapter(),
        templates: {
          header: templates.films_header()
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
      Analytics.trackEvent("search", "search", suggestion.id);
    },
    /**
     * onFocus
     *
     * Called when typeahead input is selected.
     * Clears any old result.
     *
     * @return {undefined}
     */
    onFocus: function() {
      this.$el.find('.typeahead').typeahead('val','');
      Analytics.trackEvent("search", "focus");
    }
  });
});
