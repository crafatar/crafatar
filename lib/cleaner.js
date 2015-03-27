var logging = require("./logging");
var config = require("./config");
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
        logging.debug("used mem:" + info.used_memory);
        var used = parseInt(info.used_memory) / 1024;
        logging.log("RedisCleaner:", used + "KB used");
        callback(err, used >= config.cleaning_redis_limit);
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
    file: path.join(__dirname, "..", config.faces_dir),
    prefixMultiplier: "KiB",
    isDisplayPrefixMultiplier: false,
    precision: 2
  }, function (err, response) {
    if (err) {
      callback(err, false);
    } else {
      var available = response[0].available;
      logging.log("DiskCleaner:", available + "KB available");
      callback(err, available < config.cleaning_disk_limit);
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
      var facesdir = path.join(__dirname, "..", config.faces_dir);
      var helmdir = path.join(__dirname, "..", config.helms_dir);
      var renderdir = path.join(__dirname, "..", config.renders_dir);
      var skindir = path.join(__dirname, "..", config.skins_dir);
      fs.readdir(facesdir, function (readerr, files) {
        if (!readerr) {
          for (var i = 0, l = Math.min(files.length, config.cleaning_amount); i < l; i++) {
            var filename = files[i];
            if (filename[0] !== ".") {
              fs.unlink(path.join(facesdir, filename), nil);
              fs.unlink(path.join(helmdir, filename), nil);
              fs.unlink(path.join(skindir, filename), nil);
            }
          }
        }
      });
      fs.readdir(renderdir, function (readerr, files) {
        if (!readerr) {
          for (var j = 0, l = Math.min(files.length, config.cleaning_amount); j < l; j++) {
            var filename = files[j];
            if (filename[0] !== ".") {
              fs.unlink(renderdir + filename, nil);
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