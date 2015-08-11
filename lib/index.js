var Promise = require("bluebird"),
    util = require('util'),
    fs = Promise.promisifyAll(require('fs')),
    plist = require('plist'),
    path = require('path'),
    spawn = require('./spawn'),
    XCodeBuild = require('./xcodebuild'),
    Security = require('./security'),
    MobileProvision = require('./mobileprovision');

var IosBuilder = function(cwd) {
  this.cwd = cwd || process.cwd();
  this.xcode = new XCodeBuild(cwd);

  this.init = function() {
    return Promise.all([
      MobileProvision.getProfiles(),
      Security.getIdentities(),
      this.xcode.check()
    ]).bind(this)
    .spread(this._setupSigningDb);
  };

  this.prebuild = function(opts) {
    if(!opts.prebuild) return Promise.resolve();

    var cwd = process.cwd();
    return spawn('sh', ['-c', cwd + '/' + opts.prebuild, opts.appMode || ''], {cwd: cwd});
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
        profileName: signing.profileName,
        extractDsym: opts.extractDsym
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

  this.updateProjectInfo = function(pfile, variables) {
    if(!pfile) throw new Error('[updateProjectInfo] A pfile path needs to be specified.');

    var pFile = path.join(this.cwd, pfile);

    return fs.readFileAsync(pFile, 'utf8').then(function(pContents) {
      pContents = plist.parse(pContents);
      for (var key in variables) {
        if (variables.hasOwnProperty(key)) {
          pContents[key] = variables[key];
        }
      }
      return plist.build(pContents);
    }).then(function (pContents) {
      return fs.writeFileAsync(pFile, pContents);
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
