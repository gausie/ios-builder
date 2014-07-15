var chai = require('chai'),
    sinon = require('sinon');

chai.use(require('sinon-chai'));

global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;

global.req = function(file) {
  return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../lib/') + file);
};
