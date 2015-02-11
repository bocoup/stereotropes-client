module.exports = function(grunt) {

  grunt.config.set('copy', {
    'public': {
      expand: true,
      cwd: 'assets/img',
      src: '**/*',
      dest: 'public/img',
    },
    data: {
      expand: true,
      cwd: 'assets/data',
      src: '**/*',
      dest: 'public/data',
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

};