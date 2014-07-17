/*global req, describe, it, expect */
var spawn = req('spawn');

describe('spawn', function() {
  it('returns a promise', function() {
    var ls = spawn('ls');
    expect(ls.then).to.be.a('function');
    expect(ls.catch).to.be.a('function');
    return ls;
  });

  it('rejects promise on spawn error', function() {
    var child = spawn('i-do-not-exist');
    return child.catch(function(err) {
      expect(err).to.exist;
    });
  });

  it('rejects promise if child status not 0', function() {
    var child = spawn('ls --help');
    return child.catch(function(err) {
      expect(err).to.exist;
    });
  });

  it('returns stdout if needed', function() {
    var child = spawn('ls', null, {getOutput: true});
    return child.then(function(data) {
      expect(data).to.exist;
      expect(data).to.be.a('string');
    });
  });
});
