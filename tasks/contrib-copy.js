module.exports = function(grunt) {

  grunt.config.set('copy', {
    'public': {
      expand: true,
      cwd: 'assets/img',
      src: '**/*',
      dest: 'public/img',
    },
    'favicon': {
      expand: true,
      cwd: 'assets/favicon',
      src: '**',
      dest: 'public',
    },
    'stylesheet': {
      src: 'src/html/styleguide.html',
      dest: 'public/styleguide.html'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

};
