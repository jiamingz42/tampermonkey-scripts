const timestamp = require('./timestamp.js');

function foo() {
  console.log("Hi Jiaming");
}
exports.foo = foo;
require('repl').start({}).context.exports = exports;
