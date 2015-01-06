var cluster = require('cluster');
var cleaner = require('../modules/cleaner');
var config = require('../modules/config');

if (cluster.isMaster) {
    var cores = require("os").cpus().length;
    for (var i = cores; i > 0; i--) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        console.error('Worker died. Rebooting a new one.');
        cluster.fork();
    });

    setInterval(cleaner.run, config.cleaning_interval * 1000);
} else {
    require('../server.js')();
}
