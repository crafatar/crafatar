var logging = require("./logging");
var node_redis = require("redis");
var config = require("../config");

var redis = null;

// sets up redis connection
// flushes redis when using ephemeral storage (e.g. Heroku)
function connect_redis() {
  logging.log("connecting to redis...");
  redis = node_redis.createClient(config.redis);
  redis.on("ready", function() {
    logging.log("Redis connection established.");
    if (config.caching.ephemeral) {
      logging.log("Storage is ephemeral, flushing redis");
      redis.flushall();
    }
  });
  redis.on("error", function(err) {
    logging.error(err);
  });
  redis.on("end", function() {
    logging.warn("Redis connection lost!");
  });
}

var exp = {};

// returns the redis instance
exp.get_redis = function() {
  return redis;
};

// set model type to value of *slim*
exp.set_slim = function(rid, userId, slim, callback) {
  logging.debug(rid, "setting slim for", userId, "to " + slim);
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();

  redis.hmset(userId, ["a", Number(slim)], callback);
};

// sets the timestamp for +userId+
// if +temp+ is true, the timestamp is set so that the record will be outdated after 60 seconds
// these 60 seconds match the duration of Mojang's rate limit ban
// callback: error
exp.update_timestamp = function(rid, userId, temp, callback) {
  logging.debug(rid, "updating cache timestamp (" + temp + ")");
  var sub = temp ? config.caching.local - 60 : 0;
  var time = Date.now() - sub;
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();
  redis.hmset(userId, "t", time, function(err) {
    callback(err);
  });
};

// create the key +userId+, store +skin_hash+, +cape_hash+, +slim+ and current time
// if +skin_hash+ or +cape_hash+ are undefined, they aren't stored
// this is useful to store cape and skin at separate times, without overwriting the other
// +slim+ can be true (alex) or false (steve)
// +callback+ contans error
exp.save_hash = function(rid, userId, skin_hash, cape_hash, slim, callback) {
  logging.debug(rid, "caching skin:" + skin_hash + " cape:" + cape_hash + " slim:" + slim);
  // store shorter null value instead of "null" string
  skin_hash = skin_hash === null ? "" : skin_hash;
  cape_hash = cape_hash === null ? "" : cape_hash;
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();

  var args = [];
  if (cape_hash !== undefined) {
    args.push("c", cape_hash);
  }
  if (skin_hash !== undefined) {
    args.push("s", skin_hash);
  }
  if (slim !== undefined) {
    args.push("a", Number(!!slim));
  }
  args.push("t", Date.now());

  redis.hmset(userId, args, function(err) {
    callback(err);
  });
};

// removes the hash for +userId+ from the cache
exp.remove_hash = function(rid, userId) {
  logging.debug(rid, "deleting hash from cache");
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
        slim: data.a === "1",
        time: Number(data.t)
      };
    }
    callback(err, details);
  });
};

connect_redis();
module.exports = exp;