var Promise = require("bluebird"),
    util = require('util'),
    childProcess = require('child_process');

var spawn = function(cmd, args, opts) {
  var resolve, reject, promise, child, output = [];
  args = args || [];

  promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  child = childProcess.spawn(cmd, args, opts);

  function errorMsg(err) {
    return util.format('Spawn error [%s %s]: %s', cmd, args.join(" "), JSON.stringify(err));
  }

  child.on('error', function(err) {
    return reject(errorMsg(err));
  });

  child.on('close', function(code) {
    if(code) return reject(errorMsg(code));
    return resolve(output.join(""));
  });

  if(!opts || opts && !opts.discardStderr) {
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', console.error);
  }

  if(opts && opts.logOutput) {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', console.log);
  }

  if(opts && opts.getOutput) {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
      output.push(data);
    });
  }

  return promise;
};

module.exports = spawn;
