var logging = require("./lib/logging");
var config = require("./config");

process.on("uncaughtException", function(err) {
  logging.error("uncaughtException", err.stack || err.toString());
  process.exit(1);
});

require("./lib/server.js").boot();