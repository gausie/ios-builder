var Promise = require("bluebird"),
    util = require('util'),
    glob = Promise.promisify(require("glob")),
    plist = require('plist'),
    spawn = require('./spawn');

var MobileProvision = function(identities) {

  this.list = function() {
    var cwd = util.format('%s/Library/MobileDevice/Provisioning Profiles', process.env.HOME);
    return glob(cwd + "/*.mobileprovision").bind(this);
  };

  this.extract = function(provision) {
    this.provisions = this.provisions || {};

    var teamId = provision.Entitlements['com.apple.developer.team-identifier'],
        appId = provision.Entitlements['application-identifier'];

    appId = appId.replace(/^\w+\./, "");

    this.provisions[appId] = {
      date: provision.CreationDate,
      uuid: provision.UUID,
      certificates: provision.DeveloperCertificates,
      teamId: teamId
    };
  };

  this.decodeProvisions = function() {
    return this.list().each(function(provision) {
      return spawn('openssl',
        ['smime', '-inform', 'der', '-verify', '-noverify', '-in', provision],
        {getOutput: true, logError: false}).bind(this)

      .then(function(res) {
        this.extract(plist.parse(res));
      })
    })
  };
}

module.exports = new MobileProvision();
