var networking = require('./networking');
var config = require('./config');
var cache = require('./cache');
var skins = require('./skins');

var valid_uuid = /^[0-9a-f]{32}$/;
var hash_pattern = /[0-9a-f]+$/;

function get_hash(url) {
  return hash_pattern.exec(url)[0].toLowerCase();
}

// requests skin for +uuid+ and extracts face/helm if image hash in +details+ changed
// callback contains error, image hash
function store_images(uuid, details, callback) {
  // get profile for +uuid+
  networking.get_profile(uuid, function(err, profile) {
    if (err === 0) {
      // uuid does not exist
      cache.save_hash(uuid, null);
      callback(null, null);
    } else if (err) {
      callback(err, null);
    } else {
      var skinurl = skin_url(profile);
      if (skinurl) {
        console.log(uuid + " " + skinurl);
        // set file paths
        var hash = get_hash(skinurl);
        if (details && details.hash == hash) {
          // hash hasn't changed
          console.log(uuid + " hash has not changed");
          cache.update_timestamp(uuid, hash);
          callback(null, hash);
        } else {
          // hash has changed
          console.log(uuid + "new hash: " + hash);
          var facepath = __dirname + '/../' + config.faces_dir + hash + ".png";
          var helmpath = __dirname + '/../' + config.helms_dir + hash + ".png";
          // download skin, extract face/helm
          networking.skin_file(skinurl, facepath, helmpath, function(err) {
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
        callback(null, null);
      }
    }
  });
}

// exracts the skin url of a +profile+ object
// returns null when no url found (user has no skin)
function skin_url(profile) {
  var url = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name == 'textures') {
        var json = Buffer(prop.value, 'base64').toString();
        var props = JSON.parse(json);
        url = props && props.textures && props.textures.SKIN && props.textures.SKIN.url || null;
      }
    });
  }
  return url;
}

// decides whether to get an image from disk or to download it
// callback contains error, status, hash
// the status gives information about how the image was received
//  -1: error
//   1: found on disk
//   2: profile requested/found, skin downloaded from mojang servers
//   3: profile requested/found, but it has no skin
function get_image_hash(uuid, callback) {
  cache.get_details(uuid, function(err, details) {
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time >= new Date().getTime()) {
        // uuid known + recently updated
        console.log(uuid + " uuid known & recently updated");
        callback(null, (details.hash ? 1 : 0), details.hash);
      } else {
        console.log(uuid + " uuid not known or too old");
        store_images(uuid, details, function(err, hash) {
          if (err) {
            callback(err, -1, details && details.hash);
          } else {
            console.log(uuid + " hash: " + hash);
            callback(null, (hash ? 2 : 3), hash);
          }
        });
      }
    }
  });
}

var exp = {};

// returns true if the +uuid+ is a valid uuid
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