var Promise = require("bluebird"),
    util = require('util'),
    glob = Promise.promisify(require("glob")),
    plist = require('plist'),
    spawn = require('./spawn');

var MobileProvision = function(identities) {

  this.listFiles = function() {
    var cwd = util.format('%s/Library/MobileDevice/Provisioning Profiles', process.env.HOME);
    return glob(cwd + "/*.mobileprovision").bind(this);
  };

  this.extractProfile = function(profile) {
    this.provisions = this.provisions || {};
    profile = plist.parse(profile);

    var teamId = profile.Entitlements['com.apple.developer.team-identifier'],
        appId = profile.Entitlements['application-identifier'];

    appId = appId.replace(/^\w+\./, "");

    this.provisions[appId] = {
      date: profile.CreationDate,
      uuid: profile.UUID,
      certificates: profile.DeveloperCertificates,
      teamId: teamId
    };
  };

  this.getCompleteProfiles = function() {
    if(this.provisions) return Promise.resolve(this.provisions);

    return this.listFiles()
      .each(function(profile) {
        return spawn('openssl',
            ['smime', '-inform', 'der', '-verify', '-noverify', '-in', profile],
            { getOutput: true, discardStderr: true }).bind(this)
          .then(this.extractProfile);
      })
      .then(function() { return this.provisions; })
  };
}

module.exports = new MobileProvision();
