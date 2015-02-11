module.exports = function(grunt) {

  grunt.config.set('watch', {
    livereload: {
      options: {
        livereload: true,
      },
      files: ['src/js/**/*.{js,html}', 'public/*'],
      tasks: [],
    },
    jshintrc: {
      files: ['**/.jshintrc'],
      tasks: ['jshint'],
    },
    tasks: {
      files: ['<%= jshint.tasks.src %>'],
      tasks: ['jshint:tasks'],
    },
    scripts: {
      files: ['<%= jshint.app.src %>'],
      tasks: ['jshint:app'],
    },
    jade: {
      files: 'src/jade/*.jade',
      tasks: ['jade:dev'],
    },
    assets: {
      files: 'assets/**/*',
      tasks: ['copy']
    },
    styles: {
      files: 'src/styles/**/*.styl',
      tasks: ['stylus:dev'],
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');

};