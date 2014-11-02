var config = require("./config");
var redis = null;


function connect_redis() {
  console.log("connecting to redis");
  if (process.env.REDISCLOUD_URL) {
    var redisURL = require("url").parse(process.env.REDISCLOUD_URL);
    redis = require("redis").createClient(redisURL.port, redisURL.hostname);
    redis.auth(redisURL.auth.split(":")[1]);
    redis.flushall();
  } else {
    redis = require("redis").createClient();
  }
  redis.on("ready", function() {
    console.log("Redis connection established.");
  });
  redis.on("error", function (err) {
    console.error(err);
  });
  redis.on("end", function () {
    console.warn("Redis connection lost!");
  });
}

var exp = {};

// sets the timestamp for +uuid+ to now
exp.update_timestamp = function(uuid) {
  console.log(uuid + " cache: updating timestamp");
  var time = new Date().getTime();
  redis.hmset(uuid, "t", time);
};

// create the key +uuid+, store +hash+ and time
exp.save_hash = function(uuid, hash) {
  console.log(uuid + " cache: saving hash");
  var time = new Date().getTime();
  redis.hmset(uuid, "h", hash, "t", time);
};

// get a details object for +uuid+
// {hash: "0123456789abcdef", time: 1414881524512}
// null when uuid unkown
exp.get_details = function(uuid, callback) {
  redis.hgetall(uuid, function(err, data) {
    var details = null;
    if (data) {
      details = {
        hash: (data.h == "null" ? null : data.h),
        time: data.t
      };
    }
    callback(err, details);
  });
};

connect_redis();
module.exports = exp;