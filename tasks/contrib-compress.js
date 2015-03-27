module.exports = function(grunt) {

  grunt.config.set('compress', {
    options: {
      mode: 'gzip'
    },

    'public_data' : {
      cwd : "public/assets/data/",
      src: ['**/*'],
      dest: 'public-gz/assets/data/',
      expand: true
    },

    'public_not_data' : {
      cwd : "public/",
      src: ['**/*', '!assets/data/**'],
      dest: 'public-gz',
      expand: true
    }
  });

  grunt.loadNpmTasks('grunt-contrib-compress');

};