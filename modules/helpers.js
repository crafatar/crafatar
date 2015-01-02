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

function store_skin(uuid, profile, details, callback) {
  networking.get_skin_url(uuid, profile, function(url) {
    if (url) {
      var hash = get_hash(url);
      if (details && details.skin === hash) {
        cache.update_timestamp(uuid, hash);
        callback(null, hash);
      } else {
        logging.log(uuid + " new skin hash: " + hash);
        var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
        var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png"
        fs.exists(facepath, function(exists) {
          if (exists) {
            logging.log(uuid + " skin already exists, not downloading");
            callback(null, hash);
          } else {
            networking.get_from(url, function(img, response, err) {
              if (err || !img) {
                callback(err, null);
              } else {
                skins.extract_face(img, facepath, function(err) {
                  if (err) {
                    logging.error(err);
                    callback(err, null);
                  } else {
                    logging.log(uuid + " face extracted");
                    skins.extract_helm(facepath, img, helmpath, function(err) {
                      logging.log(uuid + " helm extracted");
                      logging.debug(helmpath);
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

function store_cape(uuid, profile, details, callback) {
  networking.get_cape_url(uuid, profile, function(url) {
    if (url) {
      var hash = get_hash(url);
      if (details && details.cape === hash) {
        cache.update_timestamp(uuid, hash);
        callback(null, hash);
      } else {
        logging.log(uuid + " new cape hash: " + hash);
        var capepath = __dirname + "/../" + config.capes_dir + hash + ".png";
        fs.exists(capepath, function(exists) {
          if (exists) {
            logging.log(uuid + " cape already exists, not downloading");
            callback(null, hash);
          } else {
            networking.get_from(url, function(img, response, err) {
              if (err || !img) {
                logging.error(err);
                callback(err, null);
              } else {
                skins.save_image(img, capepath, function(err) {
                  logging.log(uuid + " cape saved");
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

function remove_from_array(arr, item) {
  var i;
  while((i = arr.indexOf(item)) !== -1) {
    arr.splice(i, 1);
  }
}

// downloads the images for +uuid+ while checking the cache
// status based on +details+. +whichhash+ specifies which
// image is more important, and should be called back on
// +callback+ contains the error buffer and image hash
var currently_running = [];
function callback_for(uuid, which, err, cape_hash, skin_hash) {
  for (var i = 0; i < currently_running.length; i++) {
    if (currently_running[i] && currently_running[i].uuid === uuid && (currently_running[i].which === which || which === null)) {
      var will_call = currently_running[i];
      will_call.callback(err, will_call.which === 'skin' ? skin_hash : cape_hash);
      //remove_from_array(currently_running, i);
      delete(currently_running[i]);
    }
  }
}

function array_has_hash(arr, property, value) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i][property] === value) {
      return true;
    }
  }
  return false;
}

function store_images(uuid, details, whichhash, callback) {
  var isUUID = uuid.length > 16;
  var new_hash = { 'uuid': uuid, 'which': whichhash, 'callback': callback };
  if (!array_has_hash(currently_running, 'uuid', uuid)) {
    currently_running.push(new_hash);
    networking.get_profile((isUUID ? uuid : null), function(err, profile) {
      if (err || (isUUID && !profile)) {
        callback_for(uuid, err, null, null);
      } else {
        store_skin(uuid, profile, details, function(err, skin_hash) {
          cache.save_hash(uuid, skin_hash, null);
          callback_for(uuid, 'skin', err, null, skin_hash);
          store_cape(uuid, profile, details, function(err, cape_hash) {
            cache.save_hash(uuid, skin_hash, cape_hash);
            callback_for(uuid, 'cape', err, cape_hash, skin_hash);
          });
        });
      }
    });
  } else {
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
exp.get_image_hash = function(uuid, raw_type, callback) {
  cache.get_details(uuid, function(err, details) {
    var type = (details !== null ? (raw_type === "skin" ? details.skin : details.cape) : null);
    if (err) {
      callback(err, -1, null);
    } else {
      if (details && details.time + config.local_cache_time * 1000 >= new Date().getTime()) {logging.log(uuid + " uuid cached & recently updated");
      callback(null, (type ? 1 : 0), type);
    } else {
      if (details) {
        logging.log(uuid + " uuid cached, but too old");
      } else {
        logging.log(uuid + " uuid not cached");
      }
      store_images(uuid, details, raw_type, function(err, hash) {
        if (err) {
          callback(err, -1, details && type);
        } else {
          var status = details && (type === hash) ? 3 : 2;
          logging.debug(uuid + " old hash: " + (details && type));
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
  exp.get_image_hash(uuid, "skin", function(err, status, hash) {
    if (hash) {
      var facepath = __dirname + "/../" + config.faces_dir + hash + ".png";
      var helmpath = __dirname + "/../" + config.helms_dir + hash + ".png";
      var filepath = facepath;
      fs.exists(helmpath, function (exists) {
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
exp.get_skin = function(uuid, callback) {
  logging.log(uuid + " skin request");
  exp.get_image_hash(uuid, 'skin', function(err, status, hash) {
    var skinpath = __dirname + "/../" + config.skins_dir + hash + ".png";
    fs.exists(skinpath, function (exists) {
      if (exists) {
        logging.log(uuid + " skin already exists, not downloading");
        skins.open_skin(uuid, skinpath, function(err, img) {
          callback(err, hash, img);
        });
      } else {
        networking.save_skin(uuid, hash, skinpath, function(err, img) {
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
exp.get_render = function(uuid, scale, helm, body, callback) {
  exp.get_skin(uuid, function(err, hash, img) {
    if (!hash) {
      callback(err, -1, hash, null);
      return;
    }
    var renderpath = __dirname + "/../" + config.renders_dir + hash + "-" + scale + "-" + get_type(helm, body) + ".png";
    fs.exists(renderpath, function(exists) {
      if (exists) {
        renders.open_render(uuid, renderpath, function(err, img) {
          callback(err, 1, hash, img);
        });
        return;
      } else {
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
            fs.writeFile(renderpath, img, "binary", function(err) {
              if (err) {
                logging.log(err);
              }
              callback(null, 2, hash, img);
            });
          }
        });
      }
    });
  });
};


// handles requests for +uuid+ skins
// callback contains error, hash, image buffer
exp.get_skin = function(uuid, callback) {
  logging.log(uuid + " skin request");
  exp.get_image_hash(uuid, "skin", function(err, status, hash) {
    var skinpath = __dirname + "/../" + config.skins_dir + hash + ".png";
    fs.exists(skinpath, function(exists) {
      if (exists) {
        logging.log("skin already exists, not downloading");
        skins.open_skin(skinpath, function(err, img) {
          callback(err, hash, img);
        });
      } else {
        networking.save_texture(uuid, hash, skinpath, function(err, response, img) {
          callback(err, hash, img);
        });
      }
    });
  });
};

// handles requests for +uuid+ capes
// callback contains error, hash, image buffer
exp.get_cape = function(uuid, callback) {
  logging.log(uuid + " cape request");
  exp.get_image_hash(uuid, "cape", function(err, status, hash) {
    if (!hash) {
      callback(err, null, null);
      return;
    }
    var capepath = __dirname + "/../" + config.capes_path + hash + ".png";
    fs.exists(capepath, function(exists) {
      if (exists) {
        logging.log("cape already exists, not downloading");
        skins.open_skin(capepath, function(err, img) {
          callback(err, hash, img);
        });
      } else {
        networking.save_texture(uuid, hash, capepath, function(err, response, img) {
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
