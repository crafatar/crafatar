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

function log(level, args, logger) {
  logger = logger || console.log;
  var time = new Date().toISOString();
  var clid = (cluster.worker && cluster.worker.id || "M");
  var lines = split_args(args).split("\n");
  for (var i = 0, l = lines.length; i < l; i++) {
    logger(time + " " + clid + " " + level + ": " + lines[i]);
  }
}

exp.log = function() {
  log(" INFO", arguments);
};
exp.warn = function() {
  log(" WARN", arguments, console.warn);
};
exp.error = function() {
  log("ERROR", arguments, console.error);
};
if (config.debug_enabled || process.env.DEBUG === "true") {
  exp.debug = function() {
    log("DEBUG", arguments);
  };
} else {
  exp.debug = function(){};
}

module.exports = exp;
