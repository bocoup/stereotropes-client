module.exports = function(grunt) {


  // TODO: set up credentials when we are ready for it
  var creds = grunt.file.readJSON("credentials.json.sample");
  // var creds = grunt.file.readJSON("credentials.json");
  // if (typeof creds === "undefined") {
  //   throw new Error("Setup your credentials.json file from the sample!");
  // }

  grunt.config.set('s3', {

    options: {
      key: creds.accessKeyId,
      secret: creds.secretAccessKey,

      // TODO: We need to actually make this!
      bucket: "gendertropes.bocoup.com",

      access: 'public-read',
      cache: false,

      headers: {

        // expire in an hour
        "Cache-Control": "max-age=3600000, public",
        "Expires": new Date(Date.now() + 3600000).toUTCString()
      }
    },
    deploy: {
      upload: [
        {
          src: "public/*.{html,txt,png,xml,ico,css,js,js.map}",
          dest: "/",
          rel: "public"
        },
        {
          src: "public/data/*",
          dest: "/",
          rel: "public"
        },
        {
          src: "public/img/*",
          dest: "/",
          rel: "public"
        },
      ]
    }
  });

  grunt.loadNpmTasks('grunt-s3');
};
