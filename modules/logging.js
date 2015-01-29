var config = require("./config");

var exp = {};

function log() {
  var time = new Date().toISOString();
  var text = '';
  for (var i = 0, l = arguments.length; i < l; i++) {
    text += ' ' + arguments[i];
  }
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
