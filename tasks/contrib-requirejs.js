module.exports = function(grunt) {

  grunt.config.set('requirejs', {
    options: {
      baseUrl: '.',
      paths: {
        'js': 'src/js',
        'main': 'src/js/main'
      },
      mainConfigFile: 'src/js/requirejs-config.js',
      insertRequire: ['js/main'],
      // name: 'lib/almond/almond',
      name : 'lib/requirejs/require',
      optimize: 'uglify2',
      generateSourceMaps: true,
      preserveLicenseComments: false,
    },

    // split build, for mobile and web, if we decide to do that:
    // web: {
    //   options: {
    //     out: 'prod/web.js',
    //     rawText: {
    //       'src/modules/mobile/core/router': 'define(function() {});'
    //     }
    //   }
    // },

    // mobile: {
    //   options: {
    //     out: 'prod/mobile.js',
    //     rawText: {
    //       'src/modules/web/core/router': 'define(function() {});'
    //     }
    //   }
    // },

    'public': {
      options: {
        out: 'public/app.js'
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');

};
