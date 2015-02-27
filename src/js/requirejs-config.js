// Shared require config regardless of platform. See main.js for requiring
// platform specific configuration.

require.config({
  baseUrl: "/",

  paths: {
    jquery: "lib/jquery/dist/jquery",
    backbone: "lib/backbone/backbone",
    underscore: "lib/lodash/dist/lodash.underscore",
    lodash: "lib/lodash/dist/lodash",
    tmpl: "lib/lodash-template-loader/loader",
    d3: "lib/d3/d3",
    d3Chart: "lib/d3.chart/d3.chart",
    bluebird: "lib/bluebird/js/browser/bluebird",
    typeahead: "lib/typeahead.js/dist/typeahead.jquery",
    bloodhound: "lib/typeahead.js/dist/bloodhound"
  },

  shim: {
    d3Chart: ["d3"],
    typeahead: {
      'deps': ['jquery'],
      'exports': 'jquery' // Make sure the noconflict configuration of jquery doesn't break this extension
    },
    bloodhound: {
      deps: ["jquery"],
      exports: "Bloodhound"
    }
  },

  deps: ["js/main"]
});
