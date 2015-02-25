module.exports = function(grunt) {

  grunt.config.set('copy', {
    'public': {
      expand: true,
      cwd: 'assets/img',
      src: '**/*',
      dest: 'public/img',
    },
    'stylesheet': {
      src: 'src/html/styleguide.html',
      dest: 'public/styleguide.html'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

};