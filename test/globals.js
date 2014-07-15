var chai = require('chai');

global.chai = chai;
global.expect = chai.expect;

global.req = function(file) {
  return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../lib/') + file);
};
