var logging = require("./lib/logging");
var cleaner = require("./lib/cleaner");
var config = require("./config");

process.on("uncaughtException", function(err) {
  logging.error("uncaughtException", err.stack || err.toString());
  process.exit(1);
});

setInterval(cleaner.run, config.cleaner.interval * 1000);

require("./lib/server.js").boot();