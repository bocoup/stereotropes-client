module.exports = function(grunt) {

  grunt.config.set('symlink', {
    data: {
      files: [
        {
          expand: true,
          overwrite: true,
          cwd: 'assets/data',
          src: ['*'],
          dest: 'public/assets/data/'
        }
      ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-symlink');

};