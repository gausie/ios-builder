var Promise = require("bluebird"),
    util = require('util'),
    glob = Promise.promisify(require("glob")),
    plist = require('plist'),
    spawn = require('./spawn'),
    Security = require('./security');

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
      name: profile.Name,
      date: profile.CreationDate,
      uuid: profile.UUID,
      publicKeys: [],
      teamId: teamId
    };

    return Promise.resolve(profile.DeveloperCertificates).bind(this)
    .each(function(cert) {
      return Security.pemToPub('echo ' + this.certToPem(cert)).bind(this)
      .then(function(pub) {
        this.provisions[appId].publicKeys.push(pub);
      })
    })
  };

  this.certToPem = function(cert) {
    cert = cert.toString('base64');

    var pem = '';
    while (cert.length > 0) {
      pem += cert.substring(0, 61) + '\n';
      cert = cert.substring(61);
    }

    return util.format('"-----BEGIN CERTIFICATE-----\n%s-----END CERTIFICATE-----"', pem);
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
