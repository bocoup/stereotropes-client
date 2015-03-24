module.exports = function(grunt) {

  grunt.config.set('clean', {
    'public': 'public',
    'public-gz' : 'public-gz'
  });

  grunt.loadNpmTasks('grunt-contrib-clean');

};