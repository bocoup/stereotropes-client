module.exports = function(grunt) {

  var opts = {
    // You need to provide a profile if you are going to use one, otherwise
    // you should have a default profile setup.
    profile : grunt.option('profile') ? ('--profile ' +  grunt.option('profile')) : '',

    // default bucket
    bucket: grunt.option('bucket') || "s3://gendertropes.bocoup.com",

    // cache control
    cacheControl: "max-age=3600000, public",
    expires: new Date(Date.now() + 3600000).toUTCString()
  };

  grunt.config('bgShell', {

      'data': {
        execOpts: {
          maxBuffer: false
        },
        cmd: grunt.template.process('aws <%= profile %> s3 sync ' +
          'assets/data <%= bucket %>/assets/data --recursive --include \'*\' ' +
          '--acl \'public-read\' --cache-control <%= cacheControl %> ' +
          '--expires <%= expires %>' , { data : opts })
      },
      "public": {
        execOpts: {
          maxBuffer: false
        },
        cmd: grunt.template.process('aws <%= profile %> s3 sync '+
          'public/ <%= bucket %> --exclude "*data/*" --recursive ' +
          '--acl \'public-read\' --cache-control <%= cacheControl %> ' +
          '--expires <%= expires %>' , { data : opts })
      }
  });

  grunt.loadNpmTasks('grunt-bg-shell');
};
