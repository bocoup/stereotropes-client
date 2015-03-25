module.exports = function(grunt) {

  // If the request URL matches any of the app's routes, rewrite
  // the URL to be /index.html. On the final production server,
  // this will most likely be done with Nginx/Apache rewrites.
  var root = '/index.html';
  function rewriteRoute(req, res, next) {
    if (/^\/adjectives/.test(req.url) ||
        /^\/films/.test(req.url) ||
        /^\/tropes/.test(req.url) ||
        /^\/gender/.test(req.url) ||
        /^\/about/.test(req.url)) {
      grunt.log.debug('PUSHSTATE ' + req.url + ' -> ' + root);
      req.url = root;
    }
    next();
  }

  function middlewareFn (connect, options) {
    var middleware = [];
    // Rewrite routes as-necessary.
    middleware.push(rewriteRoute);
    // Serve static files.
    options.base.forEach(function(base) {
      middleware.push(connect.static(base));
    });
    return middleware;
  }

  grunt.config.set('connect', {
    options: {
      port: 8081,
      hostname: '*',
      middleware: middlewareFn
    },
    dev: {
      options: {
        base: ['public', 'src', '.'],
      }
    },
    'public': {
      options: {
        base: ['public'],
        keepalive: true,
      }
    },

    // gzipped public site version
    'public-gz': {
      options: {
        base: ['public-gz'],
        keepalive: true,
        middleware: function(connect, options) {
          var m = middlewareFn(connect, options);

          // inject a header to mark all files as gzipped.
          var f = function(req, res, next) {
            res.setHeader('Content-Encoding', 'gzip');
            return next();
          };

          m.unshift(f);
          return m;
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');

};