var logging = require("./logging");
var node_redis = require("redis");
var config = require("../config");
var path = require("path");
var url = require("url");
var fs = require("fs");

var redis = null;

// sets up redis connection
// flushes redis when running on heroku (files aren't kept between pushes)
function connect_redis() {
  logging.log("connecting to redis...");
  // parse redis env
  var redis_env = (process.env.REDISCLOUD_URL || process.env.REDIS_URL);
  var redis_url = redis_env ? url.parse(redis_env) : {};
  redis_url.port = redis_url.port || 6379;
  redis_url.hostname = redis_url.hostname || "localhost";
  // connect to redis
  redis = node_redis.createClient(redis_url.port, redis_url.hostname);
  if (redis_url.auth) {
    redis.auth(redis_url.auth.split(":")[1]);
  }
  redis.on("ready", function() {
    logging.log("Redis connection established.");
    if (process.env.HEROKU) {
      logging.log("Running on heroku, flushing redis");
      redis.flushall();
    }
  });
  redis.on("error", function (err) {
    logging.error(err);
  });
  redis.on("end", function () {
    logging.warn("Redis connection lost!");
  });
}

// sets the date of the face file belonging to +skin_hash+ to now
// the helms file is ignored because we only need 1 file to read/write from
function update_file_date(rid, skin_hash) {
  if (skin_hash) {
    var face_path = path.join(__dirname, "..", config.directories.faces, skin_hash + ".png");
    fs.exists(face_path, function(exists) {
      if (exists) {
        var date = new Date();
        fs.utimes(face_path, date, date, function(err) {
          if (err) {
            logging.error(rid, "Error:", err.stack);
          }
        });
      } else {
        logging.error(rid, "tried to update", face_path + " date, but it does not exist");
      }
    });
  }
}

var exp = {};

// returns the redis instance
exp.get_redis = function() {
  return redis;
};


// updates the redis instance's server_info object
// callback: error, info object
exp.info = function(callback) {
  redis.info(function (err, res) {

    // parse the info command and store it in redis.server_info

    // this code block was taken from mranney/node_redis#on_info_cmd
    // http://git.io/LBUNbg
    var lines = res.toString().split("\r\n");
    var obj = {};
    lines.forEach(function (line) {
      var parts = line.split(":");
      if (parts[1]) {
        obj[parts[0]] = parts[1];
      }
    });
    obj.versions = [];
    if (obj.redis_version) {
      obj.redis_version.split(".").forEach(function(num) {
        obj.versions.push(+num);
      });
    }
    redis.server_info = obj;

    callback(err, redis.server_info);
  });
};

// sets the timestamp for +userId+ and its face file's (+hash+) date to the current time
// if +temp+ is true, the timestamp is set so that the record will be outdated after 60 seconds
// these 60 seconds match the duration of Mojang's rate limit ban
// callback: error
exp.update_timestamp = function(rid, userId, hash, temp, callback) {
  logging.debug(rid, "updating cache timestamp");
  var sub = temp ? (config.caching.local - 60) : 0;
  var time = Date.now() - sub;
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();
  redis.hmset(userId, "t", time, function(err) {
    callback(err);
  });
  update_file_date(rid, hash);
};

// create the key +userId+, store +skin_hash+, +cape_hash+ and time
// if either +skin_hash+ or +cape_hash+ are undefined, they will not be stored
// this feature can be used to write both cape and skin at separate times
// +callback+ contans error
exp.save_hash = function(rid, userId, skin_hash, cape_hash, callback) {
  logging.debug(rid, "caching skin:" + skin_hash + " cape:" + cape_hash);
  var time = Date.now();
  // store shorter null byte instead of "null"
  skin_hash = (skin_hash === null ? "" : skin_hash);
  cape_hash = (cape_hash === null ? "" : cape_hash);
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();
  if (skin_hash === undefined) {
    redis.hmset(userId, "c", cape_hash, "t", time, function(err) {
      callback(err);
    });
  } else if (cape_hash === undefined) {
    redis.hmset(userId, "s", skin_hash, "t", time, function(err) {
      callback(err);
    });
  } else {
    redis.hmset(userId, "s", skin_hash, "c", cape_hash, "t", time, function(err) {
      callback(err);
    });
  }
};

// removes the hash for +userId+ from the cache
exp.remove_hash = function(rid, userId) {
  logging.log(rid, "deleting hash from cache");
  redis.del(userId.toLowerCase(), "h", "t");
};

// get a details object for +userId+
// {skin: "0123456789abcdef", cape: "gs1gds1g5d1g5ds1", time: 1414881524512}
// callback: error, details
// details is null when userId not cached
exp.get_details = function(userId, callback) {
  // get userId in lower case if not null
  userId = userId && userId.toLowerCase();
  redis.hgetall(userId, function(err, data) {
    var details = null;
    if (data) {
      details = {
        skin: data.s === "" ? null : data.s,
        cape: data.c === "" ? null : data.c,
        time: Number(data.t)
      };
    }
    callback(err, details);
  });
};

connect_redis();
module.exports = exp;