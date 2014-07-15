var Promise = require("bluebird"),
    util = require('util'),
    fs = Promise.promisifyAll(require('fs')),
    plist = require('plist'),
    spawn = require('./spawn'),
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

  this.prebuild = function(opts) {
    if(!opts.prebuild) return Promise.resolve();

    var cwd = process.cwd();
    return spawn('sh', ['-c', cwd + '/' + opts.prebuild, opts.appMode || ""], {cwd: cwd});
  };

  this.build = function(opts) {
    var signing = this._signingLookup(opts.appId, opts),
        xcode = this.xcode;

    function build() {
      return xcode.build({
        configuration: opts.configuration,
        scheme: opts.scheme,
        sdk: opts.sdk,
        identity: signing.identity,
        profileId: signing.profileId
      });
    }

    return this.prebuild(opts).then(build);
  };

  this.exportIpa = function(opts) {
    var signing = this._signingLookup(opts.appId, opts),
        xcode = this.xcode;

    function archive() {
      return xcode.archive({
        archiveName: opts.archiveName,
        scheme: opts.scheme,
        configuration: opts.configuration,
        profileId: signing.profileId,
        identity: signing.identity
      });
    }

    function exportIpa() {
      return xcode.exportIpa({
        archiveName: opts.archiveName,
        ipaName: opts.ipaName,
        profileName: signing.profileName
      });
    }

    return this.prebuild(opts)
      .then(archive)
      .then(exportIpa);
  };

  this._signingLookup = function(appId, opts) {
    if(!appId) throw new Error('[_signingLookup] An app Id needs to be specified');

    var db = this.signingDb[appId];

    function signing() {
      if(!db) throw new Error('App id ' + appId + ' not found in signing db');
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
    var key, _this = this;

    function findProfileIdentity(profile) {
      var i, id;

      for(i = 0; i < profile.publicKeys.length; i++) {
        id = _this._findMatchingIdentity(profile.publicKeys[i], identities);
        if(id !== null) {
          profile.identity =id;
          break;
        }
      }
    }

    for(key in profiles) {
      if (profiles.hasOwnProperty(key)) {
        findProfileIdentity(profiles[key]);
      }
    }

    this.signingDb = profiles;
    return profiles;
  };

  this.updateProjectInfo = function(opts) {
    if(!opts.appId) throw new Error('[updateProjectInfo] An app Id needs to be specified');

    return this.xcode.getProjectName().bind(this)
    .then(function(projectName) {
      var pFile = util.format('%s/%s/%s-Info.plist', this.cwd, projectName, projectName),
          displayName = (opts.displayName || projectName) + " " + opts.appMode;

      return fs.readFileAsync(pFile, 'utf8')
        .then(function(pContents) {
          pContents = plist.parse(pContents);
          pContents.CFBundleDisplayName = displayName.trim();
          pContents.CFBundleName = displayName.trim();
          pContents.CFBundleIdentifier = opts.appId.trim();
          return fs.writeFileAsync(pFile, plist.build(pContents));
        });
    });
  };
};

IosBuilder.create = function(cwd) {
  var ib = new IosBuilder(cwd);
  return ib.init().then(function() {
    return ib;
  });
};

module.exports = IosBuilder;
