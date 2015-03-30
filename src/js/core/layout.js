define(function(require) {

  var View = require('../core/view');
  var Nav = require('../shared/nav');
  var Search = require('../shared/search');
  var Promise = require('bluebird');
  var Analytics = require("../shared/analytics");

  // pages:
  var PageConstructors = {
    'tropes' : require('../pages/tropes/tropes-page'),
    'trope' : require('../pages/trope/trope-page'),
    'films' : require('../pages/films/films-page'),
    'film' : require('../pages/film/film-page'),
    'adjectives' : require('../pages/adjectives/adjectives-page'),
    'gender' : require('../pages/gender/gender-page'),
    'about' : require('../pages/about/about-page')
  };

  var template = require('tmpl!../core/layout');

  return View.extend({
    template: template,

    initialize: function() {
      this.pages = {};
      this.currentPage = null;
      this.contentElement = '.content';
    },

    _destroyCurrentPage: Promise.method(function() {
      if (this.currentPage) {
        var c = this.pages[this.currentPage];
        delete this.pages[this.currentPage];
        return c.remove().catch(function(err) {
          console.log(err);
          Analytics.trackError(err);
        });
      } else {
        return true;
      }
    }),

    _renderNewPage: Promise.method(function(name, options, params) {
      this.currentPage = name;
      if (!this.pages[this.currentPage]) {
        this.pages[this.currentPage] = new PageConstructors[name](options, params);
      }
      return this.pages[this.currentPage].render();
    }),

    /**
     * Swaps the current page being rendered based on the name
     * @param  {String} name Page name to transfer to
     * @param {[Object]} options Optional arguments to pass to page view
     * @param {[Object]} params Url params, parsed.
     * @return {[type]}
     */
    page: Promise.method(function(name, options, params) {
      options = options || {};
      this.params = params;

      options.el = this.contentElement;
      var self = this;
      return this._destroyCurrentPage().then(function() {
        return self._renderNewPage(name, options, params)
        .catch(function(err) {
          console.log(err);
        });
      });
    }),

    _render: function() {
      var self = this;
      this.$el.html(this.template());
      this.contentElement = this.$el.find(this.contentElement);

      // add navigation bar
      this.nav = new Nav({
        el : this.$el.find('nav')
      });

      this.nav.render();

      // add search area
      this.search = new Search({
        el : this.$el.find('#search')
      });

      this.search.render();
      this.search.on('search:selected', function(options) {
        self.trigger('search:selected', options);
      });

      return this;
    }

  });

});
