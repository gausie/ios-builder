/*global req, describe, it, expect, sinon, beforeEach */
var Promise = require('bluebird'),
    Security = req('security');

describe('Security', function() {

  beforeEach(function() {
      Security.identities = null;
  });

  describe('listIdentities', function() {
    it('returns an error if command fails', function(done) {
      var _exec = sinon.stub(Security, 'exec');
      _exec.returns(Promise.reject('This is an error'));

      Security.listIdentities()
      .catch(function(err) {
        expect(err).to.exist;
        expect(err).to.eql('This is an error');
        done();
      })
      .catch(done)
      .finally(_exec.restore);
    });

    it('returns an error if no identities found', function(done) {
      var _exec = sinon.stub(Security, 'exec');
      _exec.returns(Promise.resolve());

      Security.listIdentities()
      .catch(function(err) {
        expect(err).to.exist;
        expect(err).to.have.string('No signing identities');
        done();
      })
      .catch(done)
      .finally(_exec.restore);
    });

    it('returns list of signing identities', function(done) {
      var _exec = sinon.stub(Security, 'exec');
      _exec.returns(Promise.resolve([
        '1) F123 "iPhone distribution 0"\n',
        '2) 123G "iPhone distribution 1"\n',
        '3) C213 "iPhone distribution 2"\n',
        '3 valid identities found\n\n'
      ].join('')));

      Security.listIdentities()
      .then(function(identities) {
        expect(identities).to.have.length(3);

        identities.forEach(function(id, index) {
          expect(id.name).to.exist;
          expect(id.name).to.eql('iPhone distribution ' + index);
          expect(id.pubKey).to.eql(null);
        });
        done();
      })
      .catch(done)
      .finally(_exec.restore);
    });

    it('caches result for next call', function(done) {
      var _exec = sinon.stub(Security, 'exec');
      _exec.returns(Promise.resolve('1) F123 "iPhone distribution 0"'));

      expect(Security.identities).to.not.exist;

      Security.listIdentities()
      .then(function(identities) {
        expect(identities).to.have.length(1);
        expect(Security.identities).to.eql(identities);
        return Security.listIdentities();
      })
      .then(function(identities) {
        expect(Security.identities).to.eql(identities);
        expect(_exec).to.have.been.calledOnce;
        done();
      })
      .catch(done)
      .finally(_exec.restore);
    });
  }); //end listIdentities
});
