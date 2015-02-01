var cluster = require("cluster");
var config = require("./config");

var exp = {};

function split_args(args) {
  var text = "";
  for (var i = 0, l = args.length; i < l; i++) {
    if (i > 0) {
      text += " " + args[i];
    } else {
      text += args[i];
    }
  }
  return text;
}

function log(level, args) {
  var time = new Date().toISOString();
  console.log(time + " " + (cluster.worker && cluster.worker.id || "M") + " " + level + ": " + split_args(args));
}

exp.log = function() {
  log(" INFO", arguments);
};
exp.warn = function() {
  log(" WARN", arguments);
};
exp.error = function() {
  log("ERROR", arguments);
};
if (config.debug_enabled || process.env.DEBUG === "true") {
  exp.debug = function() {
    log("DEBUG", arguments);
  };
} else {
  exp.debug = function(){};
}

module.exports = exp;
