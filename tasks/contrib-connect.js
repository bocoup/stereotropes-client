module.exports = function(grunt) {

  // If the request URL matches any of the app's routes, rewrite
  // the URL to be /index.html. On the final production server,
  // this will most likely be done with Nginx/Apache rewrites.
  var root = '/index.html';
  function rewriteRoute(req, res, next) {
    if (/^\/(?:tropes\/[^\/\?\=]+)$/.test(req.url) ||
        /^\/(?:tropes\/[A-Za-z+\/\_0-9\?\=]+)$/.test(req.url) ||
        /^\/(?:films\/[^\/\?\=]+)$/.test(req.url) ||
        /^\/(?:films\/[A-Za-z+\/\_0-9\?\=]+)$/.test(req.url) ||
        /^\/(?:adjectives\/[^\/\?\=]+)$/.test(req.url) ||
        /^\/(?:adjectives\/[A-Za-z+\/\_0-9\?\=]+)$/.test(req.url) ||
        /^\/(?:gender\/[^\/\?\=]+)$/.test(req.url) ||
        /^\/(?:gender\/[A-Za-z+\/\_0-9\?\=]+)$/.test(req.url) ||
        /^\/(?:about)$/.test(req.url)) {
      grunt.log.debug('PUSHSTATE ' + req.url + ' -> ' + root);
      req.url = root;
    }
    next();
  }

  grunt.config.set('connect', {
    options: {
      port: 8081,
      hostname: '*',
      middleware: function(connect, options) {
        var middleware = [];
        // Rewrite routes as-necessary.
        middleware.push(rewriteRoute);
        // Serve static files.
        options.base.forEach(function(base) {
          middleware.push(connect.static(base));
        });
        return middleware;
      }
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
  });

  grunt.loadNpmTasks('grunt-contrib-connect');

};