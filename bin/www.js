var logging = require ("../modules/logging");
var cleaner = require("../modules/cleaner");
var config = require("../modules/config");
var cluster = require("cluster");

if (cluster.isMaster) {
  var cores = config.clusters || require("os").cpus().length;
  logging.log("Starting " + cores + " workers");
  for (var i = 0; i < cores; i++) {
    cluster.fork();
  }

  cluster.on("exit", function (worker, code, signal) {
    logging.error("Worker died. Rebooting a new one.");
    setTimeout(cluster.fork, 100);
  });

  setInterval(cleaner.run, config.cleaning_interval * 1000);
} else {
  require("../server.js").boot();
}