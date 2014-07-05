var Promise = require("bluebird"),
    util = require('util'),
    fs = Promise.promisifyAll(require('fs')),
    plist = require('plist'),
    XCodeBuild = require('./xcodebuild'),
    Security = require('./security'),
    MobileProvision = require('./mobileprovision');

var IosBuilder = function(cwd) {
  this.cwd = cwd || process.cwd();
  this.xcode = new XCodeBuild(cwd);

  this.init = function() {
    return Promise.all([
      MobileProvision.getCompleteProfiles(),
      Security.getCompleteIdentities(),
      this.xcode.check()
    ]).bind(this)
    .spread(this._setupSigningDb);
  };

  this.build = function(opts) {
    var signing = this._signingLookup(opts.appId, opts);

    return this.xcode.build({
      configuration: opts.configuration,
      scheme: opts.scheme,
      sdk: opts.sdk,
      identity: signing.identity,
      profileId: signing.profileId,
    });
  };

  this.exportIpa = function(opts) {
    var signing = this._signingLookup(opts.appId, opts);

    return this.xcode.archive({
      archiveName: opts.archiveName,
      scheme: opts.scheme,
      configuration: opts.configuration,
      profileId: signing.profileId,
      identity: signing.identity
    })
    .bind(this)

    .then(function() {
      return this.xcode.exportIpa({
        archiveName: opts.archiveName,
        ipaName: opts.ipaName,
        profileName: signing.profileName
      })
    });
  };

  this._signingLookup = function(appId, opts) {
    if(!appId) throw new Error('[_signingLookup] An app Id needs to be specified');

    var db = this.signingDb[appId];

    function signing() {
      if(!db) throw new Error('App id ' + appId + ' not found in signing db')
      return db;
    }

    return {
      identity: opts.identity || signing().identity.name,
      profileId: opts.profileId || signing().uuid,
      profileName: opts.profileName || signing().name,
    };
  };

  this._findMatchingIdentity = function(pubKey, identities) {
    var i;
    for(i = 0; i < identities.length; i++) {
      if(identities[i].pubKey === pubKey) return identities[i];
    }

    return null;
  };

  this._setupSigningDb = function(profiles, identities) {
    var _this = this,
        key, profile;

    for(key in profiles) {
      var i, id,
          profile = profiles[key];

      for(i = 0; i < profile.publicKeys.length; i++) {
        id = _this._findMatchingIdentity(profile.publicKeys[i], identities);
        if(id !== null) {
          profile.identity =id;
          break;
        }
      }
    }

    this.signingDb = profiles;
    return profiles;
  };

  this.updateProjectInfo = function(appId, displayName, name) {
    if(!appId) throw new Error('[updateProjectInfo] An app Id needs to be specified');

    return this.xcode.getProjectName().bind(this)
    .then(function(projectName) {
      var pFile = util.format('%s/%s/%s-Info.plist', this.cwd, projectName, projectName);
      displayName = displayName || projectName;
      name = name || projectName;

      return fs.readFileAsync(pFile, 'utf8')
        .then(function(pContents) {
          pContents = plist.parse(pContents);
          pContents.CFBundleDisplayName = displayName.trim();
          pContents.CFBundleName = name.trim();
          pContents.CFBundleIdentifier = appId.trim();
          return fs.writeFileAsync(pFile, plist.build(pContents));
        });
    });
  }
};

IosBuilder.create = function(cwd) {
  var ib = new IosBuilder(cwd);
  return ib.init().then(function() {
    return ib;
  })
}

module.exports = IosBuilder;
