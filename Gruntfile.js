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
    ['jshint', 'clean:public', 'copy', 'symlink', 'jade:dev', 'stylus:dev', 'connect:dev']);

  grunt.registerTask('dev',
    'Compile and start a dev webserver.',
    ['setup-dev', 'watch']);

  grunt.registerTask('public-build',
    'Build production',
    ['clean:public', 'jade:public', 'stylus:public', 'copy', 'symlink', 'requirejs']);

  grunt.registerTask('public',
    'Compile for production (not gzipped) and start a test webserver.',
    [ 'public-build', 'connect:public']);

  grunt.registerTask('public-gz',
    'Compile for production (gzipped) and start a test webserver.',
    [ 'public-build', 'compress', 'connect:public-gz']);

  grunt.registerTask('deploy',
    'Compile for production and deploy to s3',
    ['public-build', 'compress:public_not_data', 'bgShell:public']);

  grunt.registerTask('deploy-data',
    'Compile for production and deploy to s3',
    ['public-build', 'compress:public_data', 'bgShell:data']);

  grunt.registerTask('default', ['dev']);

};