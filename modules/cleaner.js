var logging = require("./logging");
var config = require("./config");
var cache = require("./cache");
var df = require("node-df");
var fs = require("fs");

var redis = cache.get_redis();
var exp = {};

// compares redis' used_memory with cleaning_redis_limit
// callback contains error, true|false
function should_clean_redis(callback) {
  cache.info(function(err, info) {
    if (err) {
      callback(err, false);
    } else {
      try {
        logging.debug(info);
        logging.debug("used mem:" + info.used_memory);
        var used = parseInt(info.used_memory) / 1024;
        logging.log("RedisCleaner: " + used + "KB used");
        callback(err, used >= config.cleaning_redis_limit);
      } catch(e) {
        callback(e, false);
      }
    }
  });
}

// uses `df` to get the available fisk space
// callback contains error, true|false
function should_clean_disk(callback) {
  df({
    file: __dirname + "/../" + config.faces_dir,
    prefixMultiplier: "KiB",
    isDisplayPrefixMultiplier: false,
    precision: 2
  }, function (err, response) {
    if (err) {
      callback(err, false);
    } else {
      var available = response[0].available;
      logging.log("DiskCleaner: " + available + "KB available");
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
      var facesdir = __dirname + "/../" + config.faces_dir;
      var helmdir = __dirname + "/../" + config.helms_dir;
      var renderdir = __dirname + "/../" + config.renders_dir;
      var skindir = __dirname + "/../" + config.skins_dir;

      fs.readdir(facesdir, function (err, files) {
        for (var i = 0, l = Math.min(files.length, config.cleaning_amount); i < l; i++) {
          var filename = files[i];
          if (filename[0] !== ".") {
            fs.unlink(facesdir + filename, nil);
            fs.unlink(helmdir + filename, nil);
            fs.unlink(skindir + filename, nil);
          }
        }
      });
      fs.readdir(renderdir, function (err, files) {
        for (var j = 0, l = Math.min(files.length, config.cleaning_amount); j < l; j++) {
          var filename = files[j];
          if (filename[0] !== ".") {
            fs.unlink(renderdir + filename, nil);
          }
        }
      });
    } else {
      logging.log("DiskCleaner: Nothing to clean");
    }
  });
};

function nil () {}

module.exports = exp;