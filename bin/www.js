var logging = require ("../lib/logging");
var cleaner = require("../lib/cleaner");
var config = require("../lib/config");
var cluster = require("cluster");

if (cluster.isMaster) {
  var cores = config.clusters || require("os").cpus().length;
  logging.log("Starting", cores + " workers");
  for (var i = 0; i < cores; i++) {
    cluster.fork();
  }

  cluster.on("exit", function (worker) {
    logging.error("Worker #" + worker.id + " died. Rebooting a new one.");
    setTimeout(cluster.fork, 100);
  });

  setInterval(cleaner.run, config.cleaning_interval * 1000);
} else {
  require("../server.js").boot();
}