/*global req, describe, it, expect */
var spawn = req('spawn');

describe('spawn', function() {
  it('returns a promise', function(done) {
    var ls = spawn('ls');
    expect(ls.then).to.be.a('function');
    expect(ls.catch).to.be.a('function');
    ls.finally(done);
  });

  it('rejects promise on spawn error', function(done) {
    var child = spawn('i-do-not-exist');
    child.catch(function(err) {
      expect(err).to.exist;
      done();
    });
  });

  it('rejects promise if child status not 0', function(done) {
    var child = spawn('ls --help');
    child.catch(function(err) {
      expect(err).to.exist;
      done();
    });
  });

  it('returns stdout if needed', function(done) {
    var child = spawn('ls', null, {getOutput: true});
    child.then(function(data) {
      expect(data).to.exist;
      expect(data).to.be.a('string');
      done();
    });
    child.catch(done);
  });
});
