var Promise = require("bluebird"),
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),
    spawn = require('./spawn');

var XCodeBuild = function(cwd) {
  this.cmd = 'xcodebuild';
  this.cwd = cwd;

  this.check = function() {
    if(this._check) return this._check;

    function ok() {
      this._check = true;
    }

    return this.exist().bind(this)
      .then(this.hasSchemes)
      .then(this.listSdk)
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
    var _this = this;

    if(_this._hasSchemes) {
      return Promise.resolve(_this._hasSchemes);
    }

    return this.exec(['-list'], {getOutput: true, cwd: this.cwd})
      .then(function(data) {
        data = data.match(/Schemes\:/g);

        if(!data) {
          return Promise.reject('No schemes found. Simply open your project with xcode to generate schemes.');
        }

        _this._hasSchemes = true;
        return true;
      });
  };
}

module.exports = XCodeBuild;
