module.exports = function(grunt) {

  grunt.config.set('stylus', {
    options: {
      import: ['nib'],
      paths: ['src/styles'],
    },
    dev: {
      options: {
        compress: false,
        'include css': true
      },
      src: [
        'src/styles/index.styl'
      ],
      dest: 'public/app.css',
    },
    'public': {
      options: {
        compress: true,
        'include css': true
      },
      src: '<%= stylus.dev.src %>',
      dest: '<%= stylus.dev.dest %>',
    }
  });

  grunt.loadNpmTasks('grunt-contrib-stylus');

};