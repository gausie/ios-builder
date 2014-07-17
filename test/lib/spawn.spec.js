/*global req, describe, it, expect */
var spawn = req('spawn');

describe('spawn', function() {
  it('returns a promise', function() {
    var ls = spawn('ls');
    return expect(ls.then).to.be.a('function')
      .and.to.be.a('function');
  });

  it('rejects promise on spawn error', function() {
    var child = spawn('i-do-not-exist');
    return expect(child).to.eventually.be.rejected;
  });

  it('rejects promise if child status not 0', function() {
    var child = spawn('ls --help');
    return expect(child).to.eventually.be.rejected;
  });

  it('returns stdout if needed', function() {
    var child = spawn('ls', null, {getOutput: true});
    return expect(child).to.eventually.exist
      .and.to.eventually.be.a('string');
  });
});
