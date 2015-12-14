var logging = require("./logging");
var config = require("../config");
var cache = require("./cache");
var path = require("path");
var df = require("node-df");
var fs = require("fs");

var redis = cache.get_redis();
var exp = {};

// does nothing
function nil() {}

// compares redis' used_memory with cleaning_redis_limit
// callback: error, true|false
function should_clean_redis(callback) {
  cache.info(function(err, info) {
    if (err) {
      callback(err, false);
    } else {
      try {
        // logging.debug(info.toString());
        var used = parseInt(info.used_memory) / 1024;
        var result = used >= config.cleaner.redis_limit;
        var msg = "RedisCleaner: " + used + "KB used";
        (result ? logging.log : logging.debug)(msg);
        callback(err, result);
      } catch(e) {
        callback(e, false);
      }
    }
  });
}

// uses `df` to get the available fisk space
// callback: error, true|false
function should_clean_disk(callback) {
  df({
    file: config.directories.faces,
    prefixMultiplier: "KiB",
    isDisplayPrefixMultiplier: false,
    precision: 2
  }, function(err, response) {
    if (err) {
      callback(err, false);
    } else {
      var available = response[0].available;
      var result = available < config.cleaner.disk_limit;
      var msg = "DiskCleaner: " + available + "KB available";
      (result ? logging.log : logging.debug)(msg);
      callback(err, result);
    }
  });
}

// check if redis limit reached, then flush redis
// check if disk limit reached, then delete images
exp.run = function() {
  should_clean_redis(function(err, clean) {
    if (err) {
      logging.error("Failed to run RedisCleaner");
      logging.error(err);
    } else if (clean) {
      logging.warn("RedisCleaner: Redis limit reached! flushing now");
      redis.flushall();
    } else {
      logging.log("RedisCleaner: Nothing to clean");
    }
  });

  should_clean_disk(function(err, clean) {
    if (err) {
      logging.error("Failed to run DiskCleaner");
      logging.error(err);
    } else if (clean) {
      logging.warn("DiskCleaner: Disk limit reached! Cleaning images now");

      // hotfix for #139 | FIXME
      logging.warn("DiskCleaner: Flushing Redis to prevent ENOENT");
      redis.flushall();
      // end hotfix

      var skinsdir = config.directories.skins;
      var capesdir = config.directories.capes;
      var facesdir = config.directories.faces;
      var helmsdir = config.directories.helms;
      var rendersdir = config.directories.renders;
      fs.readdir(skinsdir, function(readerr, files) {
        if (!readerr) {
          for (var i = 0, l = Math.min(files.length, config.cleaner.amount); i < l; i++) {
            var filename = files[i];
            if (filename[0] !== ".") {
              fs.unlink(path.join(facesdir, filename), nil);
              fs.unlink(path.join(helmsdir, filename), nil);
              fs.unlink(path.join(skinsdir, filename), nil);
            }
          }
        }
      });
      fs.readdir(rendersdir, function(readerr, files) {
        if (!readerr) {
          for (var j = 0, l = Math.min(files.length, config.cleaner.amount); j < l; j++) {
            var filename = files[j];
            if (filename[0] !== ".") {
              fs.unlink(rendersdir + filename, nil);
            }
          }
        }
      });
      fs.readdir(capesdir, function(readerr, files) {
        if (!readerr) {
          for (var j = 0, l = Math.min(files.length, config.cleaner.amount); j < l; j++) {
            var filename = files[j];
            if (filename[0] !== ".") {
              fs.unlink(capesdir + filename, nil);
            }
          }
        }
      });
    } else {
      logging.log("DiskCleaner: Nothing to clean");
    }
  });
};

module.exports = exp;