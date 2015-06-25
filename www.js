var logging = require("./lib/logging");
var cleaner = require("./lib/cleaner");
var config = require("./config");
var cluster = require("cluster");

process.on("uncaughtException", function (err) {
  logging.error("uncaughtException", err.stack || err.toString());
});

if (cluster.isMaster) {
  var cores = config.server.clusters || require("os").cpus().length;
  logging.log("Starting", cores + " worker" + (cores > 1 ? "s" : ""));
  for (var i = 0; i < cores; i++) {
    cluster.fork();
  }

  cluster.on("exit", function (worker) {
    logging.error("Worker #" + worker.id + " died. Rebooting a new one.");
    setTimeout(cluster.fork, 100);
  });

  setInterval(cleaner.run, config.cleaner.interval * 1000);
} else {
  require("./lib/server.js").boot();
}