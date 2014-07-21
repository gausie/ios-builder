/*global before, req, describe, it, expect, sinon, beforeEach */
var Promise = require('bluebird'),
    readFile = require('fs').readFileSync,
    Security = req('security'),
    readFile = require('fs').readFileSync,
    MobileProvision = req('MobileProvision');

describe('MobileProvision', function() {
  beforeEach(function() {
    MobileProvision.profilePath = 'test/fixtures';
  });

  describe('_listFiles', function() {

    it('returns promise bound to MobileProvision', function() {
      var promise = MobileProvision._listFiles()
        .then(function(files) {
          expect(promise._boundTo).to.eql(MobileProvision);
          expect(files).to.eql(['test/fixtures/profile.mobileprovision']);
        });

      return promise;
    });

    it('rejects promise if no provision found', function() {
      MobileProvision.profilePath = 'test/empty';
      return expect(MobileProvision._listFiles())
        .to.be.rejectedWith('No mobile provision');
    });
  }); // end _listFiles

  describe('_unwrapApple', function() {
    it('rejects promise on error', function() {
      return expect(MobileProvision._unwrapApple('test/fixtures/profile.mobileprovision'))
        .to.be.rejectedWith(/Spawn error/);
    });
  }); // end _unwrapApple

  
});
