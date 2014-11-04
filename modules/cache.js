var config = require("./config");
var redis = null;
var fs = require("fs");


function connect_redis() {
  console.log("connecting to redis...");
  if (process.env.REDISCLOUD_URL) {
    var redisURL = require("url").parse(process.env.REDISCLOUD_URL);
    redis = require("redis").createClient(redisURL.port, redisURL.hostname);
    redis.auth(redisURL.auth.split(":")[1]);
  } else {
    redis = require("redis").createClient();
  }
  redis.on("ready", function() {
    console.log("Redis connection established. Flushing all data.");
    redis.flushall();
  });
  redis.on("error", function (err) {
    console.error(err);
  });
  redis.on("end", function () {
    console.warn("Redis connection lost!");
  });
}

// sets the date of the face file belonging to +hash+ to now
function update_file_date(hash) {
  if (hash) {
    var path = config.faces_dir + hash + ".png";
    fs.exists(path, function(exists) {
      if (exists) {
        var date = new Date();
        fs.utimes("path", date, date, function(err){
          if (err) {
            console.error(err);
          }
        });
      } else {
        console.error("Tried to update " + path + " date, but it doesn't exist");
      }
    });
  }
}

var exp = {};

exp.get_redis = function() {
  return redis;
};

// sets the timestamp for +uuid+ and its face file's date to now
exp.update_timestamp = function(uuid, hash) {
  console.log(uuid + " cache: updating timestamp");
  var time = new Date().getTime();
  redis.hmset(uuid, "t", time);
  update_file_date(hash);
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