var config = require("./config");

var exp = {};

function log() {
  var time = new Date().toISOString();
  var text = Array.prototype.slice.call(arguments).join(" ");
  console.log(time + ": " + text);
}

exp.log = log;
exp.warn = log;
exp.error = log;
if (config.debug_enabled) {
  exp.debug = log;
} else {
  exp.debug = function(){};
}

module.exports = exp;