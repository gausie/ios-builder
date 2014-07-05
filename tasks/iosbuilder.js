var IosBuilder = require('../'),
    path = require('path');

module.exports = function(grunt) {

  grunt.registerMultiTask('irun', function() {
    var done = this.async(),
        config = grunt.config('iconfig') || {},
        data = this.data,
        cwd = path.resolve(config.path) || process.cwd();

    IosBuilder.create(cwd).then(function(ios) {
      ios.updateProjectInfo(data.bundle)
      .then(function() {
        return ios.xcode.build({
          scheme: data.scheme || config.scheme,
          configuration: data.configuration || config.configuration,
          sdk: data.sdk || config.sdk,
          profile: data.profile,
          identity: data.identity
        })
      })
      .then(done)
      .catch(function(err) {
        grunt.fail.fatal(err);
      });
    });
  });
}
