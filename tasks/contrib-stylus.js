module.exports = function(grunt) {

  grunt.config.set('stylus', {
    options: {
      import: ['nib'],
      paths: ['src/styles'],
    },
    dev: {
      options: {
        compress: false,
      },
      src: [
        'src/styles/**/*.styl'
      ],
      dest: 'public/app.css',
    },
    'public': {
      src: '<%= stylus.dev.src %>',
      dest: '<%= stylus.dev.dest %>',
    }
  });

  grunt.loadNpmTasks('grunt-contrib-stylus');

};