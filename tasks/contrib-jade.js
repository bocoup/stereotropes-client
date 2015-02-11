module.exports = function(grunt) {

  grunt.config.set('jade', {
    options: {
      data: {
        target: '<%= grunt.task.current.target %>',
      }
    },

    dev: {
      expand: true,
      cwd: 'src/jade',
      src: '*.jade',
      dest: 'public',
      ext: '.html',
    },

    'public': '<%= jade.dev %>',

  });

  grunt.loadNpmTasks('grunt-contrib-jade');

};