var networking = require("./networking");
var logging = require("./logging");
var config = require("./config");
var cache = require("./cache");
var skins = require("./skins");
var renders = require("./renders");
var fs = require("fs");

// 0098cb60-fa8e-427c-b299-793cbd302c9a
var valid_uuid = /^([0-9a-f-A-F-]{32,36}|[a-zA-Z0-9_]{1,16})$/; // uuid|username
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
        logging.log(uuid + " " + skin_url);
        // set file paths
        var hash = get_hash(skin_url);
        if (details && details.hash == hash) {
          // hash hasn't changed
          logging.log(uuid + " hash has not changed");
          cache.update_timestamp(uuid, hash);
          callback(null, hash);
        } else {
          // hash has changed
          logging.log(uuid + " new hash: " + hash);
          var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
          var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png";

          if (fs.existsSync(facepath)) {
            logging.log(uuid + " Avatar already exists, not downloading");
            cache.save_hash(uuid, hash);
            callback(null, hash);
          } else {
            // download skin
            networking.get_skin(skin_url, function(err, img) {
              if (err || !img) {
                callback(err, null);
              } else {
                // extract face / helm
                skins.extract_face(img, facepath, function(err) {
                  if (err) {
                    callback(err);
                  } else {
                    logging.log(uuid + " face extracted");
                    logging.debug(facepath);
                    skins.extract_helm(facepath, img, helmpath, function(err) {
                      logging.log(uuid + " helm extracted");
                      logging.debug(helmpath);
                      cache.save_hash(uuid, hash);
                      callback(err, hash);
                    });
                  }
                });
              }
            });
          }
        }
      } else {
        // profile found, but has no skin
        cache.save_hash(uuid, null);
        callback(null, null);
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


// decides whether to get an image from disk or to download it
// callback contains error, status, hash
// the status gives information about how the image was received
//  -1: "error"
//   0: "none" - cached as null
//   1: "cached" - found on disk
//   2: "downloaded" - profile downloaded, skin downloaded from mojang servers
//   3: "checked" - profile re-downloaded (was too old), but it has either not changed or has no skin
exp.get_image_hash = function(uuid, callback) {
  cache.get_details(uuid, function(err, details) {
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time * 1000 >= new Date().getTime()) {
        // uuid known + recently updated
        logging.log(uuid + " uuid cached & recently updated");
        callback(null, (details.hash ? 1 : 0), details.hash);
      } else {
        if (details) {
          logging.log(uuid + " uuid cached, but too old");
        } else {
          logging.log(uuid + " uuid not cached");
        }
        store_images(uuid, details, function(err, hash) {
          if (err) {
            callback(err, -1, details && details.hash);
          } else {
            // skin is only checked (3) when uuid known AND hash didn't change
            // in all other cases the skin is downloaded (2)
            var status = details && (details.hash == hash) ? 3 : 2;
            logging.debug(uuid + " old hash: " + (details && details.hash));
            logging.log(uuid + " hash: " + hash);
            callback(null, status, hash);
          }
        });
      }
    }
  });
};


// handles requests for +uuid+ avatars with +size+
// callback contains error, status, image buffer, hash
// image is the user's face+helm when helm is true, or the face otherwise
// for status, see get_image_hash
exp.get_avatar = function(uuid, helm, size, callback) {
  logging.log("request: " + uuid);
  exp.get_image_hash(uuid, function(err, status, hash) {
    if (hash) {
      var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
      var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png";
      var filepath = facepath;
      if (helm && fs.existsSync(helmpath)) {
        filepath = helmpath;
      }
      skins.resize_img(filepath, size, function(img_err, result) {
        if (img_err) {
          callback(img_err, -1, null, hash);
        } else {
          // we might have a hash although an error occured
          // (e.g. Mojang servers not reachable, using outdated hash)
          callback(err, (err ? -1 : status), result, hash);
        }
      });
    } else {
      // hash is null when uuid has no skin
      callback(err, status, null, null);
    }
  });
};

// handles requests for +uuid+ skins
// callback contains error, hash, image buffer
exp.get_skin = function(uuid, callback) {
  logging.log(uuid + " skin request");
  exp.get_image_hash(uuid, function(err, status, hash) {
    var skinpath = __dirname + "/../" + config.skins_dir + hash + ".png";
    if (fs.existsSync(skinpath)) {
      logging.log("skin already exists, not downloading");
      skins.open_skin(skinpath, function(err, img) {
        callback(err, hash, img);
      });
      return;
    }
    networking.save_skin(uuid, hash, skinpath, function(err, img) {
      callback(err, hash, img);
    });
  });
};

function get_type(helm, body) {
  var text = body ? "body" : "head";
  return helm ? text+"helm" : text;
}

// handles creations of skin renders
// callback contanis error, hash, image buffer
exp.get_render = function(uuid, scale, helm, body, callback) {
  logging.log(uuid + " render request");
  exp.get_skin(uuid, function(err, hash, img) {
    if (!hash) {
      callback(err, -1, hash, null);
      return;
    }
    var renderpath = __dirname + "/../" + config.renders_dir + hash + "-" + scale + "-" + get_type(helm, body) + ".png";
    if (fs.existsSync(renderpath)) {
      renders.open_render(renderpath, function(err, img) {
        callback(err, 1, hash, img);
      });
      return;
    }
    if (!img) {
      callback(err, 0, hash, null);
      return;
    }
    renders.draw_model(uuid, img, scale, helm, body, function(err, img) {
      if (err) {
        callback(err, -1, hash, null);
      } else if (!img) {
        callback(null, 0, hash, null);
      } else {
        fs.writeFile(renderpath, img, "binary", function(err){
          if (err) {
            logging.log(err);
          }
          callback(null, 2, hash, img);
        });
      }
    });
  });
};

module.exports = exp;