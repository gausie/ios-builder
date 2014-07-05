var Promise = require("bluebird"),
    util = require('util'),
    fs = Promise.promisifyAll(require('fs')),
    plist = require('plist'),
    XCodeBuild = require('./xcodebuild');

var IosBuilder = function(cwd) {
  this.cwd = cwd || process.cwd();
  this.xcode = new XCodeBuild(cwd);

  this.init = function() {
    return this.xcode.check();
  };

  this.updateProjectInfo = function(name, displayName, identifier) {
    this.xcode.getProjectName().bind(this)
    .then(function(name) {
      var pFile = util.format('%s/%s/%s-Info.plist', this.cwd, name, name);

      return fs.readFileAsync(pFile, 'utf8')
        .then(function(pContents) {
          pContents = plist.parse(pContents);
          pContents.CFBundleDisplayName = displayName.trim();
          pContents.CFBundleName = name.trim();
          pContents.CFBundleIdentifier = identifier.trim();
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
  .catch(function(err) {
    throw new Error(err);
  });
}

module.exports = IosBuilder;
