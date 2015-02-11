module.exports = function(grunt) {

  grunt.config.set('jshint', {
    tasks: {
      options: {
        jshintrc: '.jshintrc',
      },
      src: ['Gruntfile.js', 'tasks/**/*.js'],
    },
    app: {
      options: {
        jshintrc: 'src/js/.jshintrc',
      },
      src: ['src/js/**/*.js'],
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

};