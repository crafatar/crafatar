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

// gets the hash from the textures.minecraft.net +url+
function get_hash(url) {
  return hash_pattern.exec(url)[0].toLowerCase();
}

function store_skin(rid, uuid, profile, details, callback) {
  networking.get_skin_url(rid, uuid, profile, function(url) {
    if (url) {
      var hash = get_hash(url);
      if (details && details.skin === hash) {
        cache.update_timestamp(rid, uuid, hash);
        callback(null, hash);
      } else {
        logging.log(rid + "new skin hash: " + hash);
        var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
        var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png";
        fs.exists(facepath, function(exists) {
          if (exists) {
            logging.log(rid + "skin already exists, not downloading");
            callback(null, hash);
          } else {
            networking.get_from(rid, url, function(img, response, err) {
              if (err || !img) {
                callback(err, null);
              } else {
                skins.extract_face(img, facepath, function(err) {
                  if (err) {
                    logging.error(rid + err.stack);
                    callback(err, null);
                  } else {
                    logging.log(rid + "face extracted");
                    skins.extract_helm(rid, facepath, img, helmpath, function(err) {
                      logging.log(rid + "helm extracted");
                      logging.debug(rid + helmpath);
                      callback(err, hash);
                    });
                  }
                });
              }
            });
          }
        });
      }
    } else {
      callback(null, null);
    }
  });
}

function store_cape(rid, uuid, profile, details, callback) {
  networking.get_cape_url(rid, uuid, profile, function(url) {
    if (url) {
      var hash = get_hash(url);
      if (details && details.cape === hash) {
        cache.update_timestamp(rid, uuid, hash);
        callback(null, hash);
      } else {
        logging.log(rid + "new cape hash: " + hash);
        var capepath = __dirname + "/../" + config.capes_dir + hash + ".png";
        fs.exists(capepath, function(exists) {
          if (exists) {
            logging.log(rid + "cape already exists, not downloading");
            callback(null, hash);
          } else {
            networking.get_from(rid, url, function(img, response, err) {
              if (err || !img) {
                logging.error(rid + err.stack);
                callback(err, null);
              } else {
                skins.save_image(img, capepath, function(err) {
                  logging.log(rid + "cape saved");
                  callback(err, hash);
                });
              }
            });
          }
        });
      }
    } else {
      callback(null, null);
    }
  });
}

// used by store_images to queue simultaneous requests for identical uuid
// the first request has to be completed until all others are continued
var currently_running = [];
// calls back all queued requests that match uuid and type
function callback_for(uuid, type, err, hash) {
  var req_count = 0;
  for (var i = 0; i < currently_running.length; i++) {
    var current = currently_running[i];
    if (current.uuid === uuid && current.type === type) {
      req_count++;
      if (req_count !== 1) {
        // otherwise this would show up on single/first requests, too
        logging.debug(current.rid + "queued " + type + " request continued");
      }
      currently_running.splice(i, 1); // remove from array
      current.callback(err, hash);
      i--;
    }
  }
  if (req_count > 1) {
    logging.debug(req_count + " simultaneous requests for " + uuid);
  }
}

// returns true if any object in +arr+ has +value+ as +property+
function deep_property_check(arr, property, value) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][property] === value) {
      return true;
    }
  }
  return false;
}

// downloads the images for +uuid+ while checking the cache
// status based on +details+. +type+ specifies which
// image type should be called back on
// +callback+ contains the error buffer and image hash
function store_images(rid, uuid, details, type, callback) {
  var is_uuid = uuid.length > 16;
  var new_hash = {
    rid: rid,
    uuid: uuid,
    type: type,
    callback: callback
  };
  if (!deep_property_check(currently_running, "uuid", uuid)) {
    currently_running.push(new_hash);
    networking.get_profile(rid, (is_uuid ? uuid : null), function(err, profile) {
      if (err || (is_uuid && !profile)) {
        callback_for(uuid, type, err, null);
      } else {
        store_skin(rid, uuid, profile, details, function(err, skin_hash) {
          cache.save_hash(rid, uuid, skin_hash, null);
          callback_for(uuid, "skin", err, skin_hash);
          store_cape(rid, uuid, profile, details, function(err, cape_hash) {
            cache.save_hash(rid, uuid, skin_hash, cape_hash);
            callback_for(uuid, "cape", err, cape_hash);
          });
        });
      }
    });
  } else {
    logging.log(rid + "ID already being processed, adding to queue");
    currently_running.push(new_hash);
  }
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
exp.get_image_hash = function(rid, uuid, raw_type, callback) {
  cache.get_details(uuid, function(err, details) {
    var type = (details !== null ? (raw_type === "skin" ? details.skin : details.cape) : null);
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time * 1000 >= new Date().getTime()) {
        logging.log(rid + "uuid cached & recently updated");
        callback(null, (type ? 1 : 0), type);
      } else {
        if (details) {
          logging.log(rid + "uuid cached, but too old");
        } else {
          logging.log(rid + "uuid not cached");
        }
        store_images(rid, uuid, details, raw_type, function(err, hash) {
          if (err) {
            callback(err, -1, details && type);
          } else {
            var status = details && (type === hash) ? 3 : 2;
            logging.debug(rid + "old hash: " + (details && type));
            logging.log(rid + "hash: " + hash);
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
exp.get_avatar = function(rid, uuid, helm, size, callback) {
  exp.get_image_hash(rid, uuid, "skin", function(err, status, hash) {
    if (hash) {
      var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
      var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png";
      var filepath = facepath;
      fs.exists(helmpath, function(exists) {
        if (helm && exists) {
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
      });
    } else {
      // hash is null when uuid has no skin
      callback(err, status, null, null);
    }
  });
};

// handles requests for +uuid+ skins
// callback contains error, hash, image buffer
exp.get_skin = function(rid, uuid, callback) {
  logging.log(rid + "skin request");
  exp.get_image_hash(rid, uuid, "skin", function(err, status, hash) {
    var skinpath = __dirname + "/../" + config.skins_dir + hash + ".png";
    fs.exists(skinpath, function(exists) {
      if (exists) {
        logging.log(rid + "skin already exists, not downloading");
        skins.open_skin(rid, skinpath, function(err, img) {
          callback(err, hash, img);
        });
      } else {
        networking.save_texture(rid, hash, skinpath, function(err, response, img) {
          callback(err, hash, img);
        });
      }
    });
  });
};

function get_type(helm, body) {
  var text = body ? "body" : "head";
  return helm ? text + "helm" : text;
}

// handles creations of skin renders
// callback contanis error, hash, image buffer
exp.get_render = function(rid, uuid, scale, helm, body, callback) {
  exp.get_skin(rid, uuid, function(err, hash, img) {
    if (!hash) {
      callback(err, -1, hash, null);
      return;
    }
    var renderpath = __dirname + "/../" + config.renders_dir + hash + "-" + scale + "-" + get_type(helm, body) + ".png";
    fs.exists(renderpath, function(exists) {
      if (exists) {
        renders.open_render(rid, renderpath, function(err, img) {
          callback(err, 1, hash, img);
        });
        return;
      } else {
        if (!img) {
          callback(err, 0, hash, null);
          return;
        }
        renders.draw_model(rid, img, scale, helm, body, function(err, img) {
          if (err) {
            callback(err, -1, hash, null);
          } else if (!img) {
            callback(null, 0, hash, null);
          } else {
            fs.writeFile(renderpath, img, "binary", function(err) {
              if (err) {
                logging.log(rid + err.stack);
              }
              callback(null, 2, hash, img);
            });
          }
        });
      }
    });
  });
};

// handles requests for +uuid+ capes
// callback contains error, hash, image buffer
exp.get_cape = function(rid, uuid, callback) {
  logging.log(rid + "cape request");
  exp.get_image_hash(rid, uuid, "cape", function(err, status, hash) {
    if (!hash) {
      callback(err, null, null);
      return;
    }
    var capepath = __dirname + "/../" + config.capes_path + hash + ".png";
    fs.exists(capepath, function(exists) {
      if (exists) {
        logging.log(rid + "cape already exists, not downloading");
        skins.open_skin(rid, capepath, function(err, img) {
          callback(err, hash, img);
        });
      } else {
        networking.save_texture(rid, hash, capepath, function(err, response, img) {
          if (response && response.statusCode === 404) {
            callback(err, hash, null);
          } else {
            callback(err, hash, img);
          }
        });
      }
    });
  });
};

module.exports = exp;
