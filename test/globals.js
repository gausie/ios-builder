var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    sinon = require('sinon');

chaiAsPromised.transferPromiseness = function(assertion, promise) {
  assertion.then = promise.then.bind(promise);
  assertion.finally = promise.finally.bind(promise);
};

chai.use(require('sinon-chai'));
chai.use(chaiAsPromised);

global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;

global.req = function(file) {
  return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../lib/') + file);
};
