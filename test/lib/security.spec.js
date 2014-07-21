/*global req, describe, it, expect, sinon, beforeEach */
var Promise = require('bluebird'),
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
});
