var Promise = require('bluebird'),
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),
    JSZip = require('jszip'),
    fs = Promise.promisifyAll(require('fs')),
    glob = Promise.promisify(require('glob')),
    spawn = require('./spawn');

var XCodeBuild = function(cwd) {
  this.cmd = 'xcodebuild';
  this.cwd = cwd || process.cwd();

  this.check = function() {
    if(this._check) return this._check;

    function ok() {
      this._check = true;
    }

    return this.exist().bind(this)
      .then(this.hasSchemes)
      .then(this.listSdk)
      .then(this.getProjectName)
      .then(ok);
  };

  this.exist = function() {
    if(this._exist) return Promise.resolve(this._exist);

    return spawn('command', ['-v', this.cmd]).bind(this)
      .then(function(code) {
        if(code) return Promise.reject('Please install xcode');

        this._exist = true;
        return true;
      });
  };

  this.exec = function(args, opts) {
    return spawn(this.cmd, args, opts);
  };

  this.selectSdk = function(isSimulator) {
    return this.listSdk().then(function(sdks) {

      for(var i = 0; i<sdks.length; i++) {
        if(isSimulator && sdks[i].match(/sim/) ||
          !isSimulator && !sdks[i].match(/sim/)) {
            return sdks[i];
          }
      }

      return Promise.reject('No sdk found');
    });
  };

  this.listSdk = function() {
    if(this._sdk) {
      return Promise.resolve(this._sdk);
    }

    return this.exec(['-showsdks'], {getOutput: true}).bind(this)
      .then(function(data) {
        data = data.match(/[A-Za-z]+\d\.\d/g);

        if(!data) {
          return Promise.reject('No sdk found.');
        }

        this._sdk = data;
        return data;
      });
  };

  this.hasSchemes = function() {
    if(this._hasSchemes) {
      return Promise.resolve(this._hasSchemes);
    }

    return this.exec(['-list'], {getOutput: true, cwd: this.cwd}).bind(this)
      .then(function(data) {
        data = data.match(/Schemes\:/g);

        if(!data) {
          return Promise.reject('No schemes found. Simply open your project with xcode to generate schemes.');
        }

        this._hasSchemes = true;
        return true;
      });
  };

  this.getProjectName = function() {
    if(this.projectName) {
      return Promise.resolve(this.projectName);
    }

    return glob(this.cwd + "/*.xcodeproj").bind(this)
      .then(function(files) {
        if(!files.length) return Promise.reject('Cannot find xcodeproj in ' + this.cwd);

        this.projectName = path.basename(files[0], '.xcodeproj');
        return this.projectName;
      });
  };
};

var Build = {
  _setupBuild: function(opts) {
    var getSdk, args = [];
    opts = opts || {};

    if(!opts.identity || !opts.profileId) {
      return Promise.reject('Code signing error: Specify a profile and an identity to continue');
    }

    if(opts.sdk) {
      getSdk = Promise.resolve(opts.sdk);
    }
    else {
      getSdk = this.selectSdk(opts.simulator);
    }

    if(opts.scheme) args.push('-scheme', opts.scheme);
    if(opts.project) args.push('-project', opts.project);
    if(opts.extractDsym) args.push('DEBUG_INFORMATION_FORMAT=dwarf-with-dsym');
    if(opts.configuration) args.push('-configuration', opts.configuration);

    args.push('clean', 'build');
    args.push(util.format('CODE_SIGN_IDENTITY=%s', opts.identity));
    args.push(util.format('PROVISIONING_PROFILE=%s', opts.profileId));
    args.push(util.format('OBJROOT=%s', opts.outDir || (this.cwd + '/build')));
    args.push(util.format('SYMROOT=%s', opts.outDir || (this.cwd + '/build')));
    args.push(util.format('-derivedDataPath', opts.outDir || this.cwd + '/build'));

    return getSdk.then(function(sdk) {
      args.push('-sdk', sdk);
      return args;
    });
  },

  build: function(opts) {
    function build(args) {
      return this.exec(args, {logOutput: true, cwd: this.cwd});
    }

    return this._setupBuild(opts).bind(this).then(build);
  }
};

var Archive = {
  _setupArchive: function(opts) {
    var args = [];
    opts = opts || {};

    if(!opts.identity || !opts.profileId) {
      return Promise.reject('Code signing error: Specify a profile and an identity to continue');
    }

    if(opts.configuration) args.push('-configuration', opts.configuration);

    args.push('-scheme', opts.scheme || this.projectName);
    args.push('archive', '-archivePath', util.format("%s/build/%s.xcarchive", this.cwd, opts.archiveName || this.projectName));
    args.push(util.format('CODE_SIGN_IDENTITY="%s"', opts.identity));
    args.push(util.format('PROVISIONING_PROFILE=%s', opts.profileId));

    return Promise.resolve(args);
  },

  archive: function(opts) {
    function archive(args) {
      return this.exec(args, {logOutput: true, cwd: this.cwd});
    }

    return this._setupArchive(opts).bind(this).then(archive);
  }
};

var Ipa = {
  _setupExportIpa: function(opts) {
    var args = [];

    if(!opts.profileName) {
      return Promise.reject('Code signing error: Specify a profile name to continue');
    }

    args.push('-exportArchive', '-exportFormat', 'IPA');
    args.push('-archivePath', util.format('%s/build/%s.xcarchive', this.cwd, opts.archiveName || this.projectName));
    //args.push('-exportProvisioningProfile', util.format('%s', opts.profileName));
    args.push('-exportWithOriginalSigningIdentity');
    args.push('-exportPath', util.format('%s/build/%s.ipa', this.cwd, opts.ipaName));

    return Promise.resolve(args);
  },

  _extractDsym: function(opts) {
    var archivePath = util.format('%s/build/%s.xcarchive', this.cwd, opts.ipaName);
    var dSYMPath = util.format('%s/build/%s.dSYM', this.cwd, opts.ipaName);

    return glob(archivePath + '/**/*.dSYM').then(function (dSYMs) {
      if (dSYMs.length === 0) {
        return Promise.reject('No dSYM directory found');
      } else {
        var dSYM = dSYMs[0];
        return [dSYM, glob(dSYM + '/**/*')];
      }
    }).spread(function (dSYM, files) {
      var zip = new JSZip();
      var zipFiles = files.map(function (file) {
        return fs.readFileAsync(file).then(function (fileData) {
          var fileNameInZip = path.relative(dSYM, file);
          zip.file(fileNameInZip, fileData);
        }).catch(function (error) {
          if (error.code !== 'EISDIR') {
            throw error;
          }
        });
      });
      return Promise.all(zipFiles).then(function() { return zip; });
    }).then(function (zip) {
      var content = zip.generate({
        type: 'nodebuffer',
        platform: process.platform
      });
      return fs.writeFileAsync(dSYMPath, content);
    }).then(function () {
      return Promise.resolve();
    }).catch(function (error) {
      return Promise.reject(error);
    });
  },

  exportIpa: function(opts) {
    function exportIpa(args) {
      return this.exec(args, {logOutput: true, cwd: this.cwd});
    }

    opts = opts || {};
    opts.ipaName = opts.ipaName || (this.projectName + "." + new Date().getTime());

    var result = this._setupExportIpa(opts).bind(this).then(exportIpa);

    if (opts.extractDsym) {
      return result.then(this._extractDsym.bind(this, opts));
    } else {
      return result;
    }
  }
};

_.extend(XCodeBuild.prototype, Build);
_.extend(XCodeBuild.prototype, Archive);
_.extend(XCodeBuild.prototype, Ipa);

module.exports = XCodeBuild;
