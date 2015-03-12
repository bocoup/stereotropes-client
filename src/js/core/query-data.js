define(function(require){
  var Backbone = require('backbone');

  /**
   * Decodes url parameters from the window url
   * @private
   * @return {Object} params
   */
  var _decodeQueryParams = function () {
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
  };

  /**
   * Encodes params from an object, back to a query string.
   * @param  {Object} params Parameters to encode
   * @return {String} queryString
   */
  var _encodeQueryParams = function(params) {
    var str = [];
    for (var key in params) {
      str.push(key + "=" + params[key]);
    }
    return "?"+str.join("&");
  };

  /**
   * Used to update the current url with the set of parameters.
   * It does not trigger any callbacks regardless of the url.
   * @private
   * @param  {Object} params Parameters
   */
  var _updateUrl = function(params) {
    // build query string
    var queryString = _encodeQueryParams(params);

    // update url without navigating
    Backbone.history.navigate(
      queryString, { replace: true }
    );
  };

  return {
    /**
     * Sets a query parameter
     * @param {String} key Key
     * @param {String} value Value
     */
    set: function(key, value) {

      // get current params
      var params = _decodeQueryParams();

      // save new ones
      params[key] = value;

      _updateUrl(params);
    },

    /**
     * Removes a param from the query string
     * @param  {String} key Key to remove
     * @return {String} value Previous value
     */
    remove: function(key) {
      // get current params
      var params = _decodeQueryParams();

      // get current value, so we can return it at the end.
      var value = params[key];

      // delete it
      delete params[key];

      // update url
      _updateUrl(params);

      // return original value
      return value;
    },

    /**
     * Returns the value of a query parameter
     * @param {String} key Key
     * @return {String|Object} value Value of param, or full params object
     */
    get: function(key) {
      // get current params
      var params = _decodeQueryParams();

      // return the value, or all of them if the key is
      // not specified.
      if (key) {
        return params[key];
      } else {
        return params;
      }
    }
  };
});