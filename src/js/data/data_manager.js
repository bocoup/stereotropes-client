define(function(require) {

  var Promise = require('bluebird');
  var _ = require('underscore');
  var $ = require('jquery');

  /**
   * The Data Manager is responsible for both loading data
   * from the server as well as for providing methods to access
   * data.
   *
   * Internally it caches data to reduce network traffic.
   *
   * Generally, public methods in this class will return a promise
   * that will resolve to the data indicated by the method.
   *
   * This module will return a singleton instance of a DataManager.
   *
   * @constructor
   * @param {Object} options options hash described below
   * @param.baseUrl {String} the url to the data folder on the server
   *                         when fetching data file paths will be appended to this.
   */
  function DataManager(options){
    options = options || {};
    this.baseUrl = options.baseUrl || '/assets/data';

    this.cache = {};
  }

  /*******************************************
  ***  Internal caching methods
  ********************************************/

  /**
   * Get a value from the cache. Each key is indexed by namespace
   *
   * @private
   *
   * @param  {String} namespace namespace for the key
   * @param  {String} key       key
   *
   * @return {Object|undefined} the stored value or undefined
   */
  DataManager.prototype._cacheGet = function(namespace, key) {
    var cacheNamespace = this.cache[namespace];
    if(_.isUndefined(cacheNamespace)){
      return undefined;
    } else {
      return this.cache[namespace][key];
    }
  };

  /**
   * Put a value into the cache, each value is stored by key and
   * further indexed by namespace.
   *
   * @private
   *
   * If a namespace does not exist already it will be created on first use.
   *
   * @param  {String} namespace namespace for the key
   * @param  {String} key       key
   * @param  {Object} val       value to store
   */
  DataManager.prototype._cacheSet = function(namespace, key, val) {
    var cacheNamespace = this.cache[namespace];
    if(_.isUndefined(cacheNamespace)){
      this.cache[namespace] = {};
    }
    this.cache[namespace][key] = val;
  };


  /**
   * Delete a value from the cache
   *
   * @private
   *
   * @param  {String} namespace
   * @param  {String} key
   */
  DataManager.prototype._cacheDelete = function(namespace, key) {
    var cacheNamespace = this.cache[namespace];
    if(!_.isUndefined(cacheNamespace)){
      delete this.cache[namespace][key];
    }
  };

  /**
   * Delete an entire namespace from the cache
   *
   * @private
   *
   * @param  {String} namespace
   */
  DataManager.prototype._cacheDeleteNamespace = function(namespace) {
    delete this.cache[namespace];
  };

  /**
   * Get an object from the cache and do something if it is not present
   * in the cache. This is a helper function to remove a small amount of boilerplate
   * around checking if a value is in the cache and returning it if it is.
   *
   * @private
   *
   * @param  {String} namespace
   * @param  {String} key
   * @param  {Function} notFoundCallback  will be called with resolve and reject of the promise
   *                                      returned by this function. This callback is expected
   *                                      to populate the cache for this entry. It should also call
   *                                      resolve with the return value expected by the method using this
   *                                      one.
   * @return {Promise[Object]}
   */
  DataManager.prototype._cacheFetch = function(namespace, key, notFoundCallback) {
    var self = this;
    return new Promise(function(resolve, reject){
      if(_.isUndefined(self._cacheGet(namespace, key))){
        return notFoundCallback(resolve, reject);
      } else {
        resolve(self._cacheGet(namespace, key));
      }
    });
  };

   /**
   * Get an object from the cache and do something if it is not present
   * in the cache. This is a helper function to remove a small amount of boilerplate
   * around checking if a value is in the cache and returning it if it is.
   *
   * @private
   *
   * @param  {String} namespace
   * @param  {String} key
   * @param  {Function} notFoundCallback  will be called with resolve and reject of the promise
   *                                      returned by this function. This callback is expected
   *                                      to populate the cache for this entry. It should also call
   *                                      resolve with the return value expected by the method using this
   *                                      one.
   * @return {Promise[Object]}
   */
  DataManager.prototype._cacheFetchNamespace = function(namespace, notFoundCallback) {
    var cacheNamespace = this.cache[namespace];
    return new Promise(function(resolve, reject) {
      if(_.isUndefined(cacheNamespace)){
        return notFoundCallback(resolve, reject);
      } else {
        resolve(cacheNamespace);
      }
    });
  };



  /*******************************************
  ***  Network operation helpers
  ********************************************/


  /**
   * Makes an ajax get request to the server.
   *
   * @private
   *
   * @param  {[type]} path path to the resource on the server
   * @return {Promise[Object]}  the object (parsed from the returned json).
   */
  DataManager.prototype._fetch = function(path) {
    var url = [this.baseUrl, path].join('');
    return Promise.resolve($.getJSON(url));
  };


  /*******************************************
  ***  Domain layer data access methods
  ********************************************/

  //
  // Trope related Methods
  //

  /**
   * Get all tropes
   * Get a list of trope ids and names. Used to display
   * and link to all tropes.
   * Currently returns:
   *  - trope name
   *  - trope id
   *  - 5 adjectives associated with trope (adjs)
   *  - trope gender
   *  - trope image_url
   *
   * @param {Promise[Array]} filter List of tropeIds to return data for specifically
   * @return {Promise[Object]}  list of all tropes
   */
  DataManager.prototype.getTropes = function(filter) {
    var self = this;
    var namespace = 'tropes_basic';
    var values;

    var getValues = function(resolve, reject) {

      values = _.values(self.cache[namespace]);
      if (typeof filter !== "undefined") {
        values = _.filter(values, function(trope) {
          return filter.indexOf(trope.id) > -1;
        });
      }
      resolve(values);
    };

    return new Promise(function(resolve, reject) {

      if(_.isUndefined(self.cache[namespace])) {
        self.getTrope("").then(function() {
          getValues(resolve);
        }).catch(function(err) {
          reject(err);
        });
      } else {
        getValues(resolve);
      }
    });
  };

  /**
   * Get all tropes in a map from id to trope information
   * The values contain:
   *  - trope name
   *  - trope id
   *  - 5 adjectives associated with trope (adjs)
   *  - trope gender
   *  - trope image_url
   *
   * @return {Promise[Object]}  Map of trope id to basic trope info
   */
  DataManager.prototype.getTropesMap = function() {
    var self = this;
    var namespace = 'tropes_basic';

    return new Promise(function(resolve, reject) {

      if(_.isUndefined(self.cache[namespace])) {
        self.getTrope("").then(function() {
          resolve(self.cache[namespace]);
        }).catch(function(err) {
          reject(err);
        });
      } else {
        resolve(self.cache[namespace]);
      }
    });
  };

  /**
   * Get basic trope information
   *
   * @param  {String} tropeId
   * @return {Promise[Object]}  The base properties for a trope.
   */
  DataManager.prototype.getTrope = function(tropeId) {
    var self = this;
    var namespace = 'tropes_basic';

    return this._cacheFetch(namespace, tropeId, function(resolve, reject){
      // Fetch and store the entries from the trope dictionary in the cache.
      return self._fetch('/tropes/trope_dict.json').then(function(tropeDict){

        _.each(tropeDict, function(value, key){
          self._cacheSet(namespace, key, value);
        });

        resolve(self._cacheGet(namespace, tropeId));

      }).catch(function(err){
        reject(err);
      });
    });
  };

  /**
   * Get detailed trope information
   *
   * @param  {String} tropeId
   * @return {Promise[Object]}  The extended properties for a trope.
   */
  DataManager.prototype.getTropeDetails = function(tropeId) {
    var self = this;
    var namespace = 'tropes_detail';

    return this._cacheFetch(namespace, tropeId, function(resolve, reject){
      // Fetch and store the entries from the trope dictionary in the cache.
      var fileName = [tropeId, '.json'].join('');
      return self._fetch('/tropes/detail/' + fileName).then(function(tropeInfo){

          self._cacheSet(namespace, tropeId, tropeInfo);

          resolve(self._cacheGet(namespace, tropeId));
      }).catch(function(err){
        reject(err);
      });
    });
  };


  /**
   * Get a list of trope ids, typically used to display
   * some shorter list of tropes. Currently returns the top
   * 100 tropes by film appearance. 50 male and 50 female tropes
   *
   * @return {Promise[Object]} list of tropes
   */
  DataManager.prototype.getTropeList = function() {
    var self = this;
    var namespace = 'tropes';

    return this._cacheFetch(namespace, 'tropeList', function(resolve, reject){
      // Fetch and store the trope list in the cache.
      return self._fetch('/tropes/trope_list_top_100_count.json').then(function(tropeList){

        self._cacheSet(namespace, 'tropeList', tropeList);

        resolve(self._cacheGet(namespace, 'tropeList'));
      }).catch(function(err){
        reject(err);
      });
    });
  };

  //
  // Adjective related Methods
  //

  /**
   * Get the data for the adjective network page.
   *
   * @return {Promise[Object]}
   */
  DataManager.prototype.getAdjectiveNetwork = function() {
    var self = this;
    var namespace = 'adjectives';
    var key = 'adjectiveNetwork';

    return this._cacheFetch(namespace, key, function(resolve, reject){
      // Fetch and store the trope list in the cache.
      return self._fetch('/adjectives/adjectives_network.json').then(function(data){

        self._cacheSet(namespace, key, data);

        resolve(self._cacheGet(namespace, key));
      }).catch(function(err){
        reject(err);
      });
    });
  };


  //
  // Gender splits related Methods
  //

  /**
   * Get the data for the gendersplits page.
   *
   * @return {Promise[Object]}
   */
  DataManager.prototype.getGenderSplits = function() {
    var self = this;
    var namespace = 'gender_split';
    var key = 'genderSplits';

    return this._cacheFetch(namespace, key, function(resolve, reject){
      // Fetch and store the trope list in the cache.
      return self._fetch('/gender/gender_splits.json').then(function(data){

        self._cacheSet(namespace, key, data);

        resolve(self._cacheGet(namespace, key));
      }).catch(function(err){
        reject(err);
      });
    });
  };

  //
  // Film Related Methods
  //


  /**
   * Get detailed trope information
   *
   * @param  {String} filmId
   * @return {Promise[Object]}  The info for the trip
   */
  DataManager.prototype.getFilmDetails = function(filmId) {
    var self = this;
    var namespace = 'films_detail';

    return this._cacheFetch(namespace, filmId, function(resolve, reject){
      // Fetch and store the entries from the trope dictionary in the cache.
      var fileName = [filmId, '.json'].join('');
      return self._fetch('/films/detail/' + fileName).then(function(tropeInfo){

          self._cacheSet(namespace, filmId, tropeInfo);

          resolve(self._cacheGet(namespace, filmId));
      }).catch(function(err){
        reject(err);
      });
    });
  };

   /**
   * Get an array of films ids and names. Used to display
   * and link to all films.
   * Currently returns film name and id
   * to be used with search
   *
   * @return {Promise[Object]} list of films with id and name attributes
   */
  DataManager.prototype.getFilms = function() {
    var self = this;
    var namespace = 'films';

    return this._cacheFetch(namespace, 'filmAll', function(resolve, reject){
      // Fetch and store the trope list in the cache.
      return self._fetch('/films/film_list_all.json').then(function(filmList){

        self._cacheSet(namespace, 'filmAll', filmList);

        resolve(self._cacheGet(namespace, 'filmAll'));
      }).catch(function(err){
        reject(err);
      });
    });
  };

  // Return an instance so that this module is effectively
  // a singleton providing a single source of truth.
  //
  // With require.js semantics this will also be run once so all
  // requires of this module will get this one instance.
  return new DataManager();

});
