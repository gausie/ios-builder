/*global before, req, describe, it, expect, sinon, beforeEach */
var Promise = require('bluebird'),
    readFile = require('fs').readFileSync,
    Security = req('security'),
    readFile = require('fs').readFileSync,
    plist = require('plist'),
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

  describe('_extractProfileData', function() {

    it('extract profile data', function() {
      var _certToPem = sinon.stub(MobileProvision, '_certToPem'),
          _pemToPub = sinon.stub(Security, 'pemToPub'),
          data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'});

      _certToPem.returns('');
      _pemToPub.returns(Promise.resolve('PUBKEY'));

      return MobileProvision._extractProfileData(data)
        .then(function(profile) {
          expect(profile.name).to.eql('Test APP');
          expect(profile.teamId).to.eql('APPID');
          expect(profile.uuid).to.eql('123ABC12-ABCD-1234-ABCD-123456789ABC');
          expect(profile.publicKeys).to.eql(['PUBKEY', 'PUBKEY']);
          expect(_pemToPub).to.have.callCount(2);
        })
        .finally(_certToPem.restore)
        .finally(_pemToPub.restore);
    });

    it('stores profiles by application-identifier', function() {
      var _certToPem = sinon.stub(MobileProvision, '_certToPem'),
          _pemToPub = sinon.stub(Security, 'pemToPub'),
          data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'});

      _certToPem.returns('');
      _pemToPub.returns(Promise.resolve('PUBKEY'));

      return MobileProvision._extractProfileData(data)
        .then(function(profile) {
          var keys = [];
          for(var k in MobileProvision.provisions) {
            if(MobileProvision.provisions.hasOwnProperty(k)) {
              keys.push(k);
            }
          }

          expect(MobileProvision.provisions).to.exist;
          expect(keys).to.eql(['com.iosbuilder.testappr']);
        })
        .finally(_certToPem.restore)
        .finally(_pemToPub.restore);
    });
  }); // end _extractProfileData

  describe('_certToPem', function() {

    it('decodes base64 certificate', function() {
      var data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'}),
          profile = plist.parse(data);

      return expect(MobileProvision._certToPem(profile.DeveloperCertificates[0]))
        .to.match(/BEGIN CERTIFICATE/)
        .and.to.match(/END CERTIFICATE/);
    });

    it('is a valid certificate', function() {
      var data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'}),
          profile = plist.parse(data),
          cert = MobileProvision._certToPem(profile.DeveloperCertificates[0]);

      return expect(Security.pemToPub('echo ' + cert))
        .to.eventually.match(/BEGIN PUBLIC KEY/)
        .and.eventually.to.match(/END PUBLIC KEY/);
    });
  }); // end _certToPem

  describe('getProfiles', function() {
    beforeEach(function() {
      MobileProvision.provisions = null;
    });

    it('returns an object containing provisioning profile', function() {
      var _certToPem = sinon.stub(MobileProvision, '_certToPem'),
          _unwrapApple = sinon.stub(MobileProvision, '_unwrapApple'),
          _pemToPub = sinon.stub(Security, 'pemToPub'),
          data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'});

      _unwrapApple.returns(Promise.resolve(data).bind(MobileProvision));
      _certToPem.returns('');
      _pemToPub.returns(Promise.resolve('PUBKEY'));

      return MobileProvision.getProfiles()
        .then(function(provisions) {
          var provision = provisions['com.iosbuilder.testappr'];
          expect(provision.name).to.eql('Test APP');
          expect(_certToPem).to.have.callCount(2);
          expect(_pemToPub).to.have.callCount(2);
        })
        .finally(_certToPem.restore)
        .finally(_unwrapApple.restore)
        .finally(_pemToPub.restore);
    });

    it('uses cached result if available', function() {
      var _certToPem = sinon.stub(MobileProvision, '_certToPem'),
          _unwrapApple = sinon.stub(MobileProvision, '_unwrapApple'),
          _pemToPub = sinon.stub(Security, 'pemToPub'),
          data = readFile('test/fixtures/profile.mobileprovision', {encoding: 'utf8'});

      _unwrapApple.returns(Promise.resolve(data).bind(MobileProvision));
      _certToPem.returns('');
      _pemToPub.returns(Promise.resolve('PUBKEY'));

      return MobileProvision.getProfiles()
        .then(function(provisions) {
          return MobileProvision.getProfiles();
        })
        .then(function(provisions) {
          var provision = provisions['com.iosbuilder.testappr'];
          expect(provision.name).to.eql('Test APP');
          expect(_certToPem).to.have.callCount(2);
          expect(_pemToPub).to.have.callCount(2);
        })
        .finally(_certToPem.restore)
        .finally(_unwrapApple.restore)
        .finally(_pemToPub.restore);
    });
  }); // end getProfiles
});
