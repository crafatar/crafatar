var networking = require('./networking');
var config = require('./config');
var cache = require('./cache');
var skins = require('./skins');

// 0098cb60-fa8e-427c-b299-793cbd302c9a
var valid_uuid = /^([0-9a-f-]{32,36}|[a-zA-Z0-9_]{1,16})$/; // uuid|username
var hash_pattern = /[0-9a-f]+$/;

function get_hash(url) {
  return hash_pattern.exec(url)[0].toLowerCase();
}

// requests skin for +uuid+ and extracts face/helm if image hash in +details+ changed
// callback contains error, image hash
function store_images(uuid, details, callback) {
  // get skin_url for +uuid+
  networking.get_skin_url(uuid, function(err, skin_url) {
    if (err) {
      callback(err, null);
    } else {
      if (skin_url) {
        console.log(uuid + " " + skin_url);
        // set file paths
        var hash = get_hash(skin_url);
        if (details && details.hash == hash) {
          // hash hasn't changed
          console.log(uuid + " hash has not changed");
          cache.update_timestamp(uuid, hash);
          callback(null, hash);
        } else {
          // hash has changed
          console.log(uuid + " new hash: " + hash);
          var facepath = __dirname + '/../' + config.faces_dir + hash + ".png";
          var helmpath = __dirname + '/../' + config.helms_dir + hash + ".png";
          // download skin, extract face/helm
          networking.skin_file(skin_url, facepath, helmpath, function(err) {
            if (err) {
              callback(err, null);
            } else {
              cache.save_hash(uuid, hash);
              callback(null, hash);
            }
          });
        }
      } else {
        // profile found, but has no skin
        cache.save_hash(uuid, null);
        callback(null, null);
      }
    }
  });
}

// decides whether to get an image from disk or to download it
// callback contains error, status, hash
// the status gives information about how the image was received
//  -1: "error"
//   0: "none" - cached as null
//   1: "cached" - found on disk
//   2: "downloaded" - profile downloaded, skin downloaded from mojang servers
//   3: "checked" - profile re-downloaded (was too old), but it has either not changed or has no skin
function get_image_hash(uuid, callback) {
  cache.get_details(uuid, function(err, details) {
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time * 1000 >= new Date().getTime()) {
        // uuid known + recently updated
        console.log(uuid + " uuid known & recently updated");
        callback(null, (details.hash ? 1 : 0), details.hash);
      } else {
        console.log(uuid + " uuid not known or too old");
        console.log("details:");
        console.log(details);
        console.log("/details");
        store_images(uuid, details, function(err, hash) {
          if (err) {
            callback(err, -1, details && details.hash);
          } else {
            console.log(uuid + " hash: " + hash);
            var oldhash = details && details.hash;
            var status = hash !== oldhash ? 2 : 3;
            callback(null, status, hash);
          }
        });
      }
    }
  });
}

var exp = {};

// returns true if the +uuid+ is a valid uuid or username
// the uuid may be not exist, however
exp.uuid_valid = function(uuid) {
  return valid_uuid.test(uuid);
};

// handles requests for +uuid+ images with +size+
// callback contains error, status, image buffer
// image is the user's face+helm when helm is true, or the face otherwise
// for status, see get_image_hash
exp.get_avatar = function(uuid, helm, size, callback) {
  console.log("\nrequest: " + uuid);
  get_image_hash(uuid, function(err, status, hash) {
    if (hash) {
      var filepath = __dirname + '/../' + (helm ? config.helms_dir : config.faces_dir) + hash + ".png";
      skins.resize_img(filepath, size, function(img_err, result) {
        if (img_err) {
          callback(img_err, -1, null);
        } else {
          // we might have a hash although an error occured
          // (e.g. Mojang servers not reachable, using outdated hash)
          callback(err, (err ? -1 : status), result);
        }
      });
    } else {
      // hash is null when uuid has no skin
      callback(err, status, null);
    }
  });
};

module.exports = exp;