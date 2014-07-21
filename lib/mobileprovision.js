var Promise = require("bluebird"),
    util = require('util'),
    glob = Promise.promisify(require("glob")),
    plist = require('plist'),
    spawn = require('./spawn'),
    Security = require('./security');

var MobileProvision = function() {
  this.profilePath = util.format('%s/Library/MobileDevice/Provisioning Profiles', process.env.HOME);

  this.getProfiles = function() {
    if(this.provisions) return Promise.resolve(this.provisions);

    return this._listFiles()
      .each(function(profilePath) {
        return this._unwrapApple(profilePath)
          .then(this._extractProfileData);
      })
      .then(function() { return this.provisions; });
  };

  // get all provisioning profile
  this._listFiles = function() {
    return glob(this.profilePath + "/*.mobileprovision").bind(this)
      .then(function(files) {
        if(!files || files.length === 0) return Promise.reject('No mobile provision found in ' + this.profilePath);
        return files;
      });
  };

  // remove smime data
  this._unwrapApple = function(profilePath) {
    return spawn('openssl',
      ['smime', '-inform', 'der', '-verify', '-noverify', '-in', profilePath],
      { getOutput: true, discardStderr: true }).bind(this);
  };

  // extract main data from profile
  this._extractProfileData = function(profile) {
    this.provisions = this.provisions || {};
    profile = plist.parse(profile);

    var teamId = profile.Entitlements['com.apple.developer.team-identifier'],
        appId = profile.Entitlements['application-identifier'];

    appId = appId.replace(/^\w+\./, "");

    this.provisions[appId] = {
      name: profile.Name,
      date: profile.CreationDate,
      uuid: profile.UUID,
      publicKeys: [],
      teamId: teamId
    };

    return Promise.resolve(profile.DeveloperCertificates).bind(this)
    .each(function(cert) {
      return Security.pemToPub('echo ' + this._certToPem(cert)).bind(this)
      .then(function(pub) {
        this.provisions[appId].publicKeys.push(pub);
      });
    });
  };

  this._certToPem = function(cert) {
    cert = cert.toString('base64');

    var pem = '';
    while (cert.length > 0) {
      pem += cert.substring(0, 61) + '\n';
      cert = cert.substring(61);
    }

    return util.format('"-----BEGIN CERTIFICATE-----\n%s-----END CERTIFICATE-----"', pem);
  };
};

module.exports = new MobileProvision();
