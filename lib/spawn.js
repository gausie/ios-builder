var Promise = require("bluebird"),
    childProcess = require('child_process');

var spawn = function(cmd, args, opts) {
  var resolve, reject, promise, child, output = [];

  promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  child = childProcess.spawn(cmd, args, opts);

  child.on('error', function(err) {
    return reject(err);
  });

  child.on('close', function(code) {
    if(code) return reject(code);
    return resolve(output.join("\n"));
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', console.error);

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
