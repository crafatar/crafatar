var networking = require("./networking");
var logging = require("./logging");
var config = require("./config");
var cache = require("./cache");
var skins = require("./skins");
var renders = require("./renders");
var fs = require("fs");

// 0098cb60-fa8e-427c-b299-793cbd302c9a
var valid_user_id = /^([0-9a-f-A-F-]{32,36}|[a-zA-Z0-9_]{1,16})$/; // uuid|username
var hash_pattern = /[0-9a-f]+$/;

// gets the hash from the textures.minecraft.net +url+
function get_hash(url) {
  return hash_pattern.exec(url)[0].toLowerCase();
}

function store_skin(rid, userId, profile, details, callback) {
  networking.get_skin_url(rid, userId, profile, function(url) {
    if (url) {
      var skin_hash = get_hash(url);
      if (details && details.skin === skin_hash) {
        cache.update_timestamp(rid, userId, skin_hash, function(err) {
          callback(err, skin_hash);
        });
      } else {
        logging.log(rid + "new skin hash: " + skin_hash);
        var facepath = __dirname + "/../" + config.faces_dir + skin_hash + ".png";
        var helmpath = __dirname + "/../" + config.helms_dir + skin_hash + ".png";
        fs.exists(facepath, function(exists) {
          if (exists) {
            logging.log(rid + "skin already exists, not downloading");
            callback(null, skin_hash);
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
                      callback(err, skin_hash);
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

function store_cape(rid, userId, profile, details, callback) {
  networking.get_cape_url(rid, userId, profile, function(url) {
    if (url) {
      var cape_hash = get_hash(url);
      if (details && details.cape === cape_hash) {
        cache.update_timestamp(rid, userId, cape_hash, function(err) {
          callback(err, cape_hash);
        });
      } else {
        logging.log(rid + "new cape hash: " + cape_hash);
        var capepath = __dirname + "/../" + config.capes_dir + cape_hash + ".png";
        fs.exists(capepath, function(exists) {
          if (exists) {
            logging.log(rid + "cape already exists, not downloading");
            callback(null, cape_hash);
          } else {
            networking.get_from(rid, url, function(img, response, err) {
              if (err || !img) {
                logging.error(rid + err.stack);
                callback(err, null);
              } else {
                skins.save_image(img, capepath, function(err) {
                  logging.log(rid + "cape saved");
                  callback(err, cape_hash);
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

// used by store_images to queue simultaneous requests for identical userId
// the first request has to be completed until all others are continued
var currently_running = [];
// calls back all queued requests that match userId and type
function callback_for(userId, type, err, hash) {
  var req_count = 0;
  for (var i = 0; i < currently_running.length; i++) {
    var current = currently_running[i];
    if (current.userid === userId && current.type === type) {
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
    logging.debug(req_count + " simultaneous requests for " + userId);
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

// downloads the images for +userId+ while checking the cache
// status based on +details+. +type+ specifies which
// image type should be called back on
// +callback+ contains error, image hash
function store_images(rid, userId, details, type, callback) {
  var is_uuid = userId.length > 16;
  var new_hash = {
    rid: rid,
    userid: userId,
    type: type,
    callback: callback
  };
  if (!deep_property_check(currently_running, "userid", userId)) {
    currently_running.push(new_hash);
    networking.get_profile(rid, (is_uuid ? userId : null), function(err, profile) {
      if (err || (is_uuid && !profile)) {
        if (!err && !profile) {
          cache.save_hash(rid, userId, null, null, function(cache_err) {
            // we have no profile, so we have neither skin nor cape
            callback_for(userId, "skin", cache_err, null);
            callback_for(userId, "cape", cache_err, null);
          });
        } else {
          callback_for(userId, type, err, null);
        }
      } else {
        store_skin(rid, userId, profile, details, function(err, skin_hash) {
          cache.save_hash(rid, userId, skin_hash, null, function(cache_err) {
            callback_for(userId, "skin", (err || cache_err), skin_hash);
            store_cape(rid, userId, profile, details, function(err, cape_hash) {
              cache.save_hash(rid, userId, skin_hash, cape_hash, function(cache_err) {
                callback_for(userId, "cape", (err || cache_err), cape_hash);
              });
            });
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

// returns true if the +userId+ is a valid userId or username
// the userId may be not exist, however
exp.id_valid = function(userId) {
  return valid_user_id.test(userId);
};

// decides whether to get an image from disk or to download it
// callback contains error, status, hash
// the status gives information about how the image was received
//  -1: "error"
//   0: "none" - cached as null
//   1: "cached" - found on disk
//   2: "downloaded" - profile downloaded, skin downloaded from mojang servers
//   3: "checked" - profile re-downloaded (was too old), but it has either not changed or has no skin
exp.get_image_hash = function(rid, userId, type, callback) {
  cache.get_details(userId, function(err, details) {
    var cached_hash = details !== null ? (type === "skin" ? details.skin : details.cape) : null;
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time * 1000 >= new Date().getTime()) {
        // use cached image
        logging.log(rid + "userId cached & recently updated");
        callback(null, (cached_hash ? 1 : 0), cached_hash);
      } else {
        // download image
        if (details) {
          logging.log(rid + "userId cached, but too old");
        } else {
          logging.log(rid + "userId not cached");
        }
        store_images(rid, userId, details, type, function(err, new_hash) {
          if (err) {
            // we might have a cached hash although an error occured
            // (e.g. Mojang servers not reachable, using outdated hash)
            callback(err, -1, details && cached_hash);
          } else {
            var status = details && (cached_hash === new_hash) ? 3 : 2;
            logging.debug(rid + "cached hash: " + (details && cached_hash));
            logging.log(rid + "new hash: " + new_hash);
            callback(null, status, new_hash);
          }
        });
      }
    }
  });
};


// handles requests for +userId+ avatars with +size+
// callback contains error, status, image buffer, skin hash
// image is the user's face+helm when helm is true, or the face otherwise
// for status, see get_image_hash
exp.get_avatar = function(rid, userId, helm, size, callback) {
  exp.get_image_hash(rid, userId, "skin", function(err, status, skin_hash) {
    if (skin_hash) {
      var facepath = __dirname + "/../" + config.faces_dir + skin_hash + ".png";
      var helmpath = __dirname + "/../" + config.helms_dir + skin_hash + ".png";
      var filepath = facepath;
      fs.exists(helmpath, function(exists) {
        if (helm && exists) {
          filepath = helmpath;
        }
        skins.resize_img(filepath, size, function(img_err, image) {
          if (img_err) {
            callback(img_err, -1, null, skin_hash);
          } else {
            callback(err, (err ? -1 : status), image, skin_hash);
          }
        });
      });
    } else {
      // hash is null when userId has no skin
      callback(err, status, null, null);
    }
  });
};

// handles requests for +userId+ skins
// callback contains error, skin hash, image buffer
exp.get_skin = function(rid, userId, callback) {
  logging.log(rid + "skin request");
  exp.get_image_hash(rid, userId, "skin", function(err, status, skin_hash) {
    var skinpath = __dirname + "/../" + config.skins_dir + skin_hash + ".png";
    fs.exists(skinpath, function(exists) {
      if (exists) {
        logging.log(rid + "skin already exists, not downloading");
        skins.open_skin(rid, skinpath, function(err, img) {
          callback(err, skin_hash, img);
        });
      } else {
        networking.save_texture(rid, skin_hash, skinpath, function(err, response, img) {
          callback(err, skin_hash, img);
        });
      }
    });
  });
};

function get_type(helm, body) {
  var text = body ? "body" : "head";
  return helm ? text + "helm" : text;
}

// handles creations of 3D renders
// callback contains error, skin hash, image buffer
exp.get_render = function(rid, userId, scale, helm, body, callback) {
  exp.get_skin(rid, userId, function(err, skin_hash, img) {
    if (!skin_hash) {
      callback(err, -1, skin_hash, null);
      return;
    }
    var renderpath = __dirname + "/../" + config.renders_dir + skin_hash + "-" + scale + "-" + get_type(helm, body) + ".png";
    fs.exists(renderpath, function(exists) {
      if (exists) {
        renders.open_render(rid, renderpath, function(err, img) {
          callback(err, 1, skin_hash, img);
        });
        return;
      } else {
        if (!img) {
          callback(err, 0, skin_hash, null);
          return;
        }
        renders.draw_model(rid, img, scale, helm, body, function(err, img) {
          if (err) {
            callback(err, -1, skin_hash, null);
          } else if (!img) {
            callback(null, 0, skin_hash, null);
          } else {
            fs.writeFile(renderpath, img, "binary", function(err) {
              if (err) {
                logging.log(rid + err.stack);
              }
              callback(null, 2, skin_hash, img);
            });
          }
        });
      }
    });
  });
};

// handles requests for +userId+ capes
// callback contains error, cape hash, image buffer
exp.get_cape = function(rid, userId, callback) {
  logging.log(rid + "cape request");
  exp.get_image_hash(rid, userId, "cape", function(err, status, cape_hash) {
    if (!cape_hash) {
      callback(err, null, null);
      return;
    }
    var capepath = __dirname + "/../" + config.capes_dir + cape_hash + ".png";
    fs.exists(capepath, function(exists) {
      if (exists) {
        logging.log(rid + "cape already exists, not downloading");
        skins.open_skin(rid, capepath, function(err, img) {
          callback(err, cape_hash, img);
        });
      } else {
        networking.save_texture(rid, cape_hash, capepath, function(err, response, img) {
          if (response && response.statusCode === 404) {
            callback(err, cape_hash, null);
          } else {
            callback(err, cape_hash, img);
          }
        });
      }
    });
  });
};

module.exports = exp;
