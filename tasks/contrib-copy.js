module.exports = function(grunt) {

  grunt.config.set('copy', {
    'public': {
      expand: true,
      cwd: 'assets/img',
      src: '**/*',
      dest: 'public/img',
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

};