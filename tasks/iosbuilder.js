var IosBuilder = require('../'),
    path = require('path');

module.exports = function(grunt) {

  grunt.registerMultiTask('irun', function() {
    var done = this.async(),
        config = grunt.config('iconfig') || {},
        data = this.data,
        cwd = path.resolve(config.path) || process.cwd();

    IosBuilder.create(cwd).then(function(ios) {
      ios.updateProjectInfo(data.appId)
      .then(function() {
        return ios.build({
          appId: data.appId,
          scheme: data.scheme || config.scheme,
          configuration: data.configuration || config.configuration,
          sdk: data.sdk || config.sdk,
          profileId: data.profileId,
          identity: data.identity
        })
      })
      .then(done);
    });
  });

  grunt.registerMultiTask('ideploy', function() {
    var done = this.async(),
        config = grunt.config('iconfig') || {},
        data = this.data,
        cwd = path.resolve(config.path) || process.cwd();

    IosBuilder.create(cwd).then(function(ios) {
      ios.updateProjectInfo(data.appId)
      .then(function() {
        return ios.exportIpa({
          appId: data.appId,
          archiveName: data.archiveName,
          scheme: data.scheme || config.scheme,
          configuration: data.configuration || config.configuration,
          profileId: data.profileId,
          identity: data.identity,
          ipaName: data.ipaName,
          profileName: data.profileName
        });
      })
      .then(done);
    });
  });
}
