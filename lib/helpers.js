var networking = require("./networking");
var logging = require("./logging");
var renders = require("./renders");
var config = require("../config");
var cache = require("./cache");
var skins = require("./skins");
var path = require("path");
var fs = require("fs");

// 0098cb60-fa8e-427c-b299-793cbd302c9a
var valid_user_id = /^[0-9a-f-A-F-]{32,36}$/; // uuid
var hash_pattern = /[0-9a-f]+$/;

// gets the hash from the textures.minecraft.net +url+
function get_hash(url) {
  return hash_pattern.exec(url)[0].toLowerCase();
}

// gets the skin for +userId+ with +profile+
// uses +cache_details+ to determine if the skin needs to be downloaded or can be taken from cache
// face and face+helm images are extracted and stored to files
// callback: error, skin hash, slim
function store_skin(rid, userId, profile, cache_details, callback) {
  networking.get_skin_info(rid, userId, profile, function(err, url, slim) {
    if (err) {
      slim = cache_details ? cache_details.slim : undefined;
    }

    if (!err && url) {
      var skin_hash = get_hash(url);
      if (cache_details && cache_details.skin === skin_hash) {
        cache.update_timestamp(rid, userId, false, function(cache_err) {
          callback(cache_err, skin_hash, slim);
        });
      } else {
        logging.debug(rid, "new skin hash:", skin_hash);
        var facepath = path.join(config.directories.faces, skin_hash + ".png");
        var helmpath = path.join(config.directories.helms, skin_hash + ".png");
        var skinpath = path.join(config.directories.skins, skin_hash + ".png");
        fs.access(facepath, function(fs_err) {
          if (!fs_err) {
            logging.debug(rid, "skin already exists, not downloading");
            callback(null, skin_hash, slim);
          } else {
            networking.get_from(rid, url, function(img, response, err1) {
              if (err1 || !img) {
                callback(err1, null, slim);
              } else {
                skins.save_image(img, skinpath, function(skin_err) {
                  if (skin_err) {
                    callback(skin_err, null, slim);
                  } else {
                    skins.extract_face(img, facepath, function(err2) {
                      if (err2) {
                        callback(err2, null, slim);
                      } else {
                        logging.debug(rid, "face extracted");
                        skins.extract_helm(rid, facepath, img, helmpath, function(err3) {
                          logging.debug(rid, "helm extracted");
                          logging.debug(rid, helmpath);
                          callback(err3, skin_hash, slim);
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    } else {
      callback(err, null);
    }
  });
}

// gets the cape for +userId+ with +profile+
// uses +cache_details+ to determine if the cape needs to be downloaded or can be taken from cache
// the cape - if downloaded - is stored to file
// callback: error, cape hash
function store_cape(rid, userId, profile, cache_details, callback) {
  networking.get_cape_url(rid, userId, profile, function(err, url) {
    if (!err && url) {
      var cape_hash = get_hash(url);
      if (cache_details && cache_details.cape === cape_hash) {
        cache.update_timestamp(rid, userId, false, function(cache_err) {
          callback(cache_err, cape_hash);
        });
      } else {
        logging.debug(rid, "new cape hash:", cape_hash);
        var capepath = path.join(config.directories.capes, cape_hash + ".png");
        fs.access(capepath, function(fs_err) {
          if (!fs_err) {
            logging.debug(rid, "cape already exists, not downloading");
            callback(null, cape_hash);
          } else {
            networking.get_from(rid, url, function(img, response, net_err) {
              if (net_err || !img) {
                callback(net_err, null);
              } else {
                skins.save_image(img, capepath, function(skin_err) {
                  logging.debug(rid, "cape saved");
                  callback(skin_err, cape_hash);
                });
              }
            });
          }
        });
      }
    } else {
      callback(err, null);
    }
  });
}

// used by store_images to queue simultaneous requests for identical userId
// the first request has to be completed until all others are continued
// otherwise we risk running into Mojang's rate limit and deleting the cached skin
var requests = {
  skin: {},
  cape: {}
};

function push_request(userId, type, fun) {
  // avoid special properties (e.g. 'constructor')
  var userId_safe = "!" + userId;
  if (!requests[type][userId_safe]) {
    requests[type][userId_safe] = [];
  }
  requests[type][userId_safe].push(fun);
}

// calls back all queued requests that match userId and type
function resume(userId, type, err, hash, slim) {
  var userId_safe = "!" + userId;
  var callbacks = requests[type][userId_safe];
  if (callbacks) {
    if (callbacks.length > 1) {
      logging.debug(callbacks.length, "simultaneous requests for", userId);
    }

    for (var i = 0; i < callbacks.length; i++) {
      // continue the request
      callbacks[i](err, hash, slim);
      // remove from array
      callbacks.splice(i, 1);
      i--;
    }

    // it's still an empty array
    delete requests[type][userId_safe];
  }
}

// downloads the images for +userId+ while checking the cache
// status based on +cache_details+. +type+ specifies which
// image type should be called back on
// callback: error, image hash, slim
function store_images(rid, userId, cache_details, type, callback) {
  if (requests[type]["!" + userId]) {
    logging.debug(rid, "adding to request queue");
    push_request(userId, type, callback);
  } else {
    // add request to the queue
    push_request(userId, type, callback);

    networking.get_profile(rid, userId, function(err, profile) {
      if (err || !profile) {
        // error or uuid without profile
        if (!err && !profile) {
          // no error, but uuid without profile
          cache.save_hash(rid, userId, null, null, undefined, function(cache_err) {
            // we have no profile, so we have neither skin nor cape
            resume(userId, "skin", cache_err, null, false);
            resume(userId, "cape", cache_err, null, false);
          });
        } else {
          // an error occured, not caching. we can try again in 60 seconds
          resume(userId, type, err, null, false);
        }
      } else {
        // no error and we have a profile (if it's a uuid)
        store_skin(rid, userId, profile, cache_details, function(store_err, skin_hash, slim) {
          if (store_err && !skin_hash) {
            // an error occured, not caching. we can try in 60 seconds
            resume(userId, "skin", store_err, null, slim);
          } else {
            cache.save_hash(rid, userId, skin_hash, undefined, slim, function(cache_err) {
              resume(userId, "skin", (store_err || cache_err), skin_hash, slim);
            });
          }
        });
        store_cape(rid, userId, profile, cache_details, function(store_err, cape_hash) {
          if (store_err && !cape_hash) {
            // an error occured, not caching. we can try in 60 seconds
            resume(userId, "cape", (store_err), cape_hash, false);
          } else {
            cache.save_hash(rid, userId, undefined, cape_hash, undefined, function(cache_err) {
              resume(userId, "cape", (store_err || cache_err), cape_hash, false);
            });
          }
        });
      }
    });
  }
}

var exp = {};

// returns true if the +userId+ is a valid userId
// the UUID might not exist, however
exp.id_valid = function(userId) {
  return valid_user_id.test(userId);
};

// decides whether to get a +type+ image for +userId+ from disk or to download it
// callback: error, status, hash, slim
// for status, see response.js
exp.get_image_hash = function(rid, userId, type, callback) {
  cache.get_details(userId, function(err, cache_details) {
    var cached_hash = null;
    if (cache_details !== null) {
      cached_hash = type === "skin" ? cache_details.skin : cache_details.cape;
    }
    if (err) {
      callback(err, -1, null, false);
    } else {
      if (cache_details && cache_details[type] !== undefined && cache_details.time + config.caching.local * 1000 >= Date.now()) {
        // use cached image
        logging.debug(rid, "userId cached & recently updated");
        callback(null, (cached_hash ? 1 : 0), cached_hash, cache_details.slim);
      } else {
        // download image
        if (cache_details && cache_details[type] !== undefined) {
          logging.debug(rid, "userId cached, but too old");
          logging.debug(rid, JSON.stringify(cache_details));
        } else {
          logging.debug(rid, "userId not cached");
        }
        store_images(rid, userId, cache_details, type, function(store_err, new_hash, slim) {
          if (store_err) {
            // we might have a cached hash although an error occured
            // (e.g. Mojang servers not reachable, using outdated hash)

            // when hitting the rate limit, let's pretend the request succeeded and bump the TTL
            var ratelimited = store_err.code === "RATELIMIT";
            cache.update_timestamp(rid, userId, !ratelimited, function(err2) {
              callback(err2 || store_err, -1, cache_details && cached_hash, slim);
            });
          } else {
            var status = cache_details && (cached_hash === new_hash) ? 3 : 2;
            logging.debug(rid, "cached hash:", (cache_details && cached_hash));
            logging.debug(rid, "new hash:", new_hash);
            callback(null, status, new_hash, slim);
          }
        });
      }
    }
  });
};


// handles requests for +userId+ avatars with +size+
// callback: error, status, image buffer, skin hash
// image is the user's face+overlay when overlay is true, or the face otherwise
// for status, see get_image_hash
exp.get_avatar = function(rid, userId, overlay, size, callback) {
  exp.get_image_hash(rid, userId, "skin", function(err, status, skin_hash, slim) {
    if (skin_hash) {
      var facepath = path.join(config.directories.faces, skin_hash + ".png");
      var helmpath = path.join(config.directories.helms, skin_hash + ".png");
      var filepath = facepath;
      fs.access(helmpath, function(fs_err) {
        if (overlay && !fs_err) {
          filepath = helmpath;
        }
        skins.resize_img(filepath, size, function(img_err, image) {
          if (img_err) {
            callback(img_err, -1, null, skin_hash);
          } else {
            status = err ? -1 : status;
            callback(err, status, image, skin_hash);
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
// callback: error, skin hash, status, image buffer, slim
exp.get_skin = function(rid, userId, callback) {
  exp.get_image_hash(rid, userId, "skin", function(err, status, skin_hash, slim) {
    if (skin_hash) {
      var skinpath = path.join(config.directories.skins, skin_hash + ".png");
      fs.access(skinpath, function(fs_err) {
        if (!fs_err) {
          logging.debug(rid, "skin already exists, not downloading");
          skins.open_skin(rid, skinpath, function(skin_err, img) {
            callback(skin_err || err, skin_hash, status, img, slim);
          });
        } else {
          networking.save_texture(rid, skin_hash, skinpath, function(net_err, response, img) {
            callback(net_err || err, skin_hash, status, img, slim);
          });
        }
      });
    } else {
      callback(err, null, status, null, slim);
    }
  });
};

// helper method used for file names
// possible returned names based on +overlay+ and +body+ are:
// body, bodyhelm, head, headhelm
function get_type(overlay, body) {
  var text = body ? "body" : "head";
  return overlay ? text + "helm" : text;
}

// handles creations of 3D renders
// callback: error, skin hash, image buffer
exp.get_render = function(rid, userId, scale, overlay, body, callback) {
  exp.get_skin(rid, userId, function(err, skin_hash, status, img, slim) {
    if (!skin_hash) {
      callback(err, status, skin_hash, null);
      return;
    }
    var renderpath = path.join(config.directories.renders, [skin_hash, scale, get_type(overlay, body), slim ? "s" : "t"].join("-") + ".png");
    fs.access(renderpath, function(fs_err) {
      if (!fs_err) {
        renders.open_render(rid, renderpath, function(render_err, rendered_img) {
          callback(render_err, 1, skin_hash, rendered_img);
        });
        return;
      } else {
        if (!img) {
          callback(err, 0, skin_hash, null);
          return;
        }
        renders.draw_model(rid, img, scale, overlay, body, slim || userId.toLowerCase() === "mhf_alex", function(draw_err, drawn_img) {
          if (draw_err) {
            callback(draw_err, -1, skin_hash, null);
          } else if (!drawn_img) {
            callback(null, 0, skin_hash, null);
          } else {
            fs.writeFile(renderpath, drawn_img, "binary", function(write_err) {
              callback(write_err, 2, skin_hash, drawn_img);
            });
          }
        });
      }
    });
  });
};

// handles requests for +userId+ capes
// callback: error, cape hash, status, image buffer
exp.get_cape = function(rid, userId, callback) {
  exp.get_image_hash(rid, userId, "cape", function(err, status, cape_hash, slim) {
    if (!cape_hash) {
      callback(err, null, status, null);
      return;
    }
    var capepath = path.join(config.directories.capes, cape_hash + ".png");
    fs.access(capepath, function(fs_err) {
      if (!fs_err) {
        logging.debug(rid, "cape already exists, not downloading");
        skins.open_skin(rid, capepath, function(skin_err, img) {
          callback(skin_err || err, cape_hash, status, img);
        });
      } else {
        networking.save_texture(rid, cape_hash, capepath, function(net_err, response, img) {
          if (response && response.statusCode === 404) {
            callback(net_err, cape_hash, status, null);
          } else {
            callback(net_err, cape_hash, status, img);
          }
        });
      }
    });
  });
};

module.exports = exp;