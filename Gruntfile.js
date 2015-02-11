module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  });

  // Load Grunt plugins.
  grunt.loadTasks('tasks');

  // Tasks.
  grunt.registerTask('setup-dev',
    'Prepare development environment',
    ['jshint', 'clean:public', 'copy', 'jade:dev', 'stylus:dev', 'connect:dev']);

  grunt.registerTask('dev',
    'Compile and start a dev webserver.',
    ['setup-dev', 'watch']);

  grunt.registerTask('public-build',
    'Build production',
    ['clean:public', 'jade:public', 'stylus:public', 'copy', 'requirejs']);

  grunt.registerTask('public',
    'Compile for production and start a test webserver.',
    [ 'public-build', 'connect:public']);

  grunt.registerTask('deploy',
    'Compile for production and deploy to s3',
    ['public-build', 's3']);

  grunt.registerTask('default', ['dev']);

};