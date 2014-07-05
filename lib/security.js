var Promise = require("bluebird"),
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),
    exec = Promise.promisify(require('child_process').exec),
    spawn = require('./spawn');

var Security = function() {
  this.cmd = 'security';

  this.exec = function(args, opts) {
    return spawn(this.cmd, args, opts);
  };

  this.listIdentities = function() {
    if(this.identities) return Promise.resolve(this.identities);

    return this.exec(['find-identity', '-p', 'codesigning', '-v'], {getOutput: true}).bind(this)
      .then(function(list) {
        list = list.match(/\".*\"/g);
        if(!list) return Promise.reject('No signing identities found. Install certificates from Apple Member center');

        this.identities = list.map(function(id) {
          return {name: id.replace(/\"/g, ""), pubKey: null};
        });

        return this.identities;
      })
  };

  this.getCompleteIdentities = function() {
    if(this.identities) return Promise.resolve(this.identities);
    return this.listIdentities().each(this.extractKeyFromIdentity);
  };

  this.extractKeyFromIdentity = function(identity) {
    return exec(util.format('security find-certificate -c "%s" -p | openssl x509 -noout -pubkey', identity.name))
      .spread(function(stdout, stderr) {
        if(stderr) return Promise.reject(stderr);
        identity.pubKey = stdout;
        return identity;
      });
  }
};

module.exports = new Security();
