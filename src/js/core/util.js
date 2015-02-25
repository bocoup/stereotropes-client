define(function(require) {
  return {
    decodeQueryParams : function () {
      var match,
          pl     = /\+/g,  // Regex for replacing addition symbol with a space
          search = /([^&=]+)=?([^&]*)/g,
          decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
          query  = window.location.search.substring(1);

      var urlParams = {};
      while (match = search.exec(query)) {
         urlParams[decode(match[1])] = decode(match[2]);
      }

      return urlParams;
    },

    encodeQueryParams: function(params) {

    }
  };
});