var cluster = require("cluster");
var config = require("../config");

var exp = {};

// returns all values in the +args+ object separated by " "
function join_args(args) {
  var values = [];
  for (var i = 0, l = args.length; i < l; i++) {
    values.push(args[i]);
  }
  return values.join(" ");
}

// prints +args+ to +logger+ (defaults to `console.log`)
// the +level+ and a timestamp is prepended to each line of log
// the timestamp can be disabled in the config
function log(level, args, logger) {
  logger = logger || console.log;
  var time = config.server.log_time ? new Date().toISOString() + " " : "";
  var clid = (cluster.worker && cluster.worker.id || "M");
  var lines = join_args(args).split("\n");
  for (var i = 0, l = lines.length; i < l; i++) {
    logger(time + clid, level + ":", lines[i]);
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
if (config.server.debug_enabled || process.env.DEBUG === "true") {
  exp.debug = function() {
    log("DEBUG", arguments);
  };
} else {
  exp.debug = function() {};
}

module.exports = exp;