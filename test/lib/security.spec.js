/*global req, describe, it, expect, sinon, beforeEach */
var Promise = require('bluebird'),
    readFile = require('fs').readFileSync,
    Security = req('security');

describe('Security', function() {

  beforeEach(function() {
    Security.identities = null;
  });

  describe('listIdentities', function() {
    it('returns an error if command fails', function() {
      var _exec = sinon.stub(Security, '_exec');
      _exec.returns(Promise.reject('This is an error'));

      return expect(Security._listIdentities()).to.eventually.be.rejectedWith('This is an error')
        .finally(_exec.restore);
    });

    it('returns an error if no identities found', function() {
      var _exec = sinon.stub(Security, '_exec');
      _exec.returns(Promise.resolve());

      return expect(Security._listIdentities()).to.eventually.be.rejectedWith(/No signing identities/)
        .finally(_exec.restore);
    });

    it('returns list of signing identities', function() {
      var _exec = sinon.stub(Security, '_exec');
      _exec.returns(Promise.resolve([
        '1) F123 "iPhone distribution 0"\n',
        '2) 123G "iPhone distribution 1"\n',
        '3) C213 "iPhone distribution 2"\n',
        '3 valid identities found\n\n'
      ].join('')));

      return Security._listIdentities()
      .then(function(identities) {
        expect(identities).to.have.length(3);

        identities.forEach(function(id, index) {
          expect(id.name).to.exist;
          expect(id.name).to.eql('iPhone distribution ' + index);
          expect(id.pubKey).to.eql(null);
        });
      })
      .finally(_exec.restore);
    });

    it('caches result for next call', function() {
      var _exec = sinon.stub(Security, '_exec');
      _exec.returns(Promise.resolve('1) F123 "iPhone distribution 0"'));

      expect(Security.identities).to.not.exist;

      return Security._listIdentities()
      .then(function(identities) {
        expect(identities).to.have.length(1);
        expect(Security.identities).to.eql(identities);
        return Security._listIdentities();
      })
      .then(function(identities) {
        expect(Security.identities).to.eql(identities);
        expect(_exec).to.have.been.calledOnce;
      })
      .finally(_exec.restore);
    });
  }); //end listIdentities

  describe('getIdentities', function() {

    it('returns a list of identities', function() {
      var _listIdentities = sinon.stub(Security, '_listIdentities'),
          _extractKeyFromIdentity = sinon.stub(Security, '_extractKeyFromIdentity', function(id) {
            id.pubKey = 'pubKey';
            return id;
          });

      _listIdentities.returns(Promise.resolve([{ name: 'identity1'}, { name: 'identity2'}]));

      return Security.getIdentities()
        .then(function(identities) {
          expect(identities).to.have.length(2);
          expect(identities).to.eql([{ name: 'identity1', pubKey: 'pubKey'}, { name: 'identity2', pubKey: 'pubKey'}]);
          expect(_extractKeyFromIdentity).to.have.callCount(2);
        })
        .finally(_listIdentities.restore)
        .finally(_extractKeyFromIdentity.restore);
    });

    it('caches results for next call', function() {
      var _exec = sinon.stub(Security, '_exec'),
          _extractKeyFromIdentity = sinon.stub(Security, '_extractKeyFromIdentity', function(id) {
            id.pubKey = 'pubKey';
            return id;
          });

      _exec.returns(Promise.resolve([
        '1) F123 "identity1"\n',
        '2) 123G "identity2"\n',
        '2 valid identities found\n\n'
      ].join('')));

      expect(Security.identities).to.not.exist;

      return Security.getIdentities()
        .then(function(identities) {
          expect(Security.identities).to.exist;
          return Security.getIdentities();
        })
        .then(function(identities) {
          expect(identities).to.have.length(2);
          expect(identities).to.eql([{ name: 'identity1', pubKey: 'pubKey'}, { name: 'identity2', pubKey: 'pubKey'}]);
          expect(_extractKeyFromIdentity).to.have.callCount(2);
        })
        .finally(_exec.restore)
        .finally(_extractKeyFromIdentity.restore);
    });
  }); //end getIdentities

  describe('pemToPub', function() {

    it('returns pub key', function() {
      var pem = readFile('test/fixtures/cert.pem', {encoding: 'utf8'});
      return Security.pemToPub('echo "' + pem + '"')
        .then(function(pub) {
          expect(pub).to.match(/BEGIN PUBLIC KEY/);
          expect(pub).to.match(/END PUBLIC KEY/);
        });
    });

    it('rejects promise on error', function() {
      var pem = readFile('test/fixtures/cert.pem', {encoding: 'utf8'});
      pem = pem.replace('-----BEGIN CERTIFICATE-----', '');
      pem = pem.replace('-----END CERTIFICATE-----', '');
      return expect(Security.pemToPub('echo "' + pem + '"'))
        .to.eventually.be.rejectedWith(/Command failed/);
    });
  }); //end pemToPub

  describe('extractKeyFromIdentity', function() {

    it('rejects promise if no public key is found', function() {
      var _pemToPub = sinon.stub(Security, 'pemToPub');
      _pemToPub.returns(Promise.resolve(null));

      return expect(Security._extractKeyFromIdentity({name: 'identity'}))
        .to.be.rejected
        .finally(_pemToPub.restore);
    });

    it('returns identity with public key', function() {
      var _pemToPub = sinon.stub(Security, 'pemToPub');
      _pemToPub.returns(Promise.resolve("this is pub key"));

      return expect(Security._extractKeyFromIdentity({name: 'identity'}))
        .to.eventually.eql({name: 'identity', pubKey: 'this is pub key'})
        .finally(_pemToPub.restore);
    });
  });// end extractKeyFromIdentity
});
