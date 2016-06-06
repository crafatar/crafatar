'use strict';

var networking = require("./networking");
var logging = require("./logging");
var renders = require("./renders");
var config = require("../config");
var cache = require("./cache");
var skins = require("./skins");
var path = require("path");
var fs = require("fs");
let Boom = require('boom');
let Bluebird = require('bluebird');
Bluebird.promisifyAll(fs);
let promisify = require('promisify-node');

// 0098cb60-fa8e-427c-b299-793cbd302c9a
const valid_user_id = /^([0-9a-f-A-F-]{32,36}|[a-zA-Z0-9_]{1,16})$/; // uuid|username
const hash_pattern = /[0-9a-f]+$/;

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
    if (!err && userId.length > 16) {
      // updating username with model info from uuid details
      cache.set_slim(rid, profile.name, slim);
    } else {
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
                    skins.extract_face(img, facepath)
                      .then(function() {
                        logging.debug(rid, "face extracted");
                        return skins.extract_helm(rid, facepath, img, helmpath);
                      }).then(function() {
                        logging.debug(rid, "helm extracted");
                        logging.debug(rid, helmpath);
                        callback(err3, skin_hash, slim);
                      }).catch(function(err2) {
                        if (err2.message = 'ExtractFaceError') {
                          callback(err2, null, slim);
                        } else {
                          callback(err2, skin_hash, slim);
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
  var is_uuid = userId.length > 16;
  if (requests[type]["!" + userId]) {
    logging.debug(rid, "adding to request queue");
    push_request(userId, type, callback);
  } else {
    // add request to the queue
    push_request(userId, type, callback);

    networking.get_profile(rid, (is_uuid ? userId : null), function(err, profile) {
      if (err || (is_uuid && !profile)) {
        // error or uuid without profile
        if (!err && !profile) {
          // no error, but uuid without profile
          cache.save_hash(rid, userId, null, null, undefined, function(cache_err) {
            // we have no profile, so we have neither skin nor cape
            resume(userId, "skin", cache_err, null, false);
            resume(userId, "cape", cache_err, null, false);
          });
        } else {
          // an error occured, not caching. we can try in 60 seconds
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

// Checks if the +userId+ is a valid userId or username. If it is not valid, it
// throws a Boom error
// the userId may be not exist, however
exp.validateUserId = function(userId) {
  let isValid = valid_user_id.test(userId);
  if (!isValid) {
    throw Boom.badRequest('Invalid UserID');
  }
  userId = userId.replace(/-/g, "");
  return userId;
};

// decides whether to get a +type+ image for +userId+ from disk or to download it
// callback: error, status, hash, slim
// for status, see response.js
exp.get_image_hash = function*(rid, userId, type) {
  let cache_details = yield promisify(cache.get_details)(userId);
  var cached_hash = null;
  if (cache_details !== null) {
    cached_hash = type === "skin" ? cache_details.skin : cache_details.cape;
  }
  if (cache_details && cache_details[type] !== undefined && cache_details.time + config.caching.local * 1000 >= Date.now()) {
    // use cached image
    logging.debug(rid, "userId cached & recently updated");
    return {
      status: cached_hash ? 1 : 0,
      hash: cached_hash,
      slim: cache_details.slim
    };
  } else {
    // download image
    if (cache_details && cache_details[type] !== undefined) {
      logging.debug(rid, "userId cached, but too old");
      logging.debug(rid, JSON.stringify(cache_details));
    } else {
      logging.debug(rid, "userId not cached");
    }

    return yield new Promise(function(resolve, reject) {
      store_images(rid, userId, cache_details, type, function(store_err, new_hash, slim) {
        if (store_err) {
          // we might have a cached hash although an error occured
          // (e.g. Mojang servers not reachable, using outdated hash)
          cache.update_timestamp(rid, userId, true, function(err2) {
            if (err2) {
              return reject(err2);
            }

            return resolve({
              status: -1,
              hash: cache_details && cached_hash,
              slim
            });
          });
        } else {
          var status = cache_details && (cached_hash === new_hash) ? 3 : 2;
          logging.debug(rid, "cached hash:", (cache_details && cached_hash));
          logging.debug(rid, "new hash:", new_hash);
          return resolve({
            status,
            hash: new_hash,
            slim
          });
        }
      });
    });
  }
};


// handles requests for +userId+ avatars with +size+
// callback: error, status, image buffer, skin hash
// image is the user's face+overlay when overlay is true, or the face otherwise
// for status, see get_image_hash
exp.get_avatar = function*(rid, userId, overlay, size, callback) {
  let data = yield exp.get_image_hash(rid, userId, "skin");
  let status = data.status;
  let skin_hash = data.hash;
  let slim = data.slim;

  if (skin_hash) {
    var facepath = path.join(config.directories.faces, skin_hash + ".png");
    var helmpath = path.join(config.directories.helms, skin_hash + ".png");
    var filepath = facepath;

    try {
      yield fs.accessAsync(helmpath);
    } catch (err) {
      if (overlay) {
        filepath = helmpath;
      }
      cache.remove_hash(rid, userId);
    }
    let image = yield skins.resize_img(filepath, size);
    return {
      image,
      hash: skin_hash,
      status
    };
  } else {
    // hash is null when userId has no skin
    return {
      status,
      image: null,
      hash: null
    };
  }
};
// handles requests for +userId+ skins
// callback: error, skin hash, status, image buffer, slim
exp.get_skin = function*(rid, userId) {
  let data = yield exp.get_image_hash(rid, userId, "skin")
  let status = data.status;
  let skin_hash = data.hash;
  let slim = data.slim;
  if (skin_hash) {
    var skinpath = path.join(config.directories.skins, skin_hash + ".png");
    return fs.accessAsync(skinpath)
      .then(function() {
        logging.debug(rid, "skin already exists, not downloading");
        return skins.open_skin(rid, skinpath)
          .then(function(img) {
            return {
              hash: skin_hash,
              status,
              image: img,
              slim
            }
          });
      }).catch(function(fs_err) {
        promisify(networking.save_texture)(rid, skin_hash, skinpath)
          .then(function(data2) {
            return {
              hash: skin_hash,
              status,
              image: data2.img,
              slim
            }
          });
      });
  } else {
    cache.remove_hash(this.id, userId);
    return {
      hash: null,
      status,
      image: null,
      slim
    };
  }
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
exp.get_render = function*(rid, userId, scale, overlay, body) {
  let data = yield exp.get_skin(rid, userId);
  let skin_hash = data.hash;
  let status = data.status;
  let img = data.image;
  let slim = data.slim;
  if (!skin_hash) {
    return {
      status,
      hash: skin_hash,
      image: null
    };
  }
  var renderpath = path.join(config.directories.renders, [skin_hash, scale, get_type(overlay, body), slim ? "s" : "t"].join("-") + ".png");
  try {
    yield fs.accessAsync(renderpath, fs.W_OK);
    let rendered_img = yield renders.open_render(rid, renderpath);
    return {
      status: 1,
      hash: skin_hash,
      image: rendered_img
    };
  } catch (fs_err) {
    if (!img) {
      if (fs_err.code === "ENOENT") {
        // no such file
        cache.remove_hash(this.id, userId);
      }
      return {
        status: 0,
        hash: skin_hash,
        image: null
      };
    }
    let drawn_img = yield renders.draw_model(rid, img, scale, overlay, body, slim || userId.toLowerCase() === "mhf_alex");
    if (!drawn_img) {
      return {
        status: 0,
        hash: skin_hash,
        image: null
      };
    } else {
      yield fs.writeFileAsync(renderpath, drawn_img, "binary");
      return {
        status: 2,
        hash: skin_hash,
        image: drawn_img
      };
    }
  }
};

// handles requests for +userId+ capes
// callback: error, cape hash, status, image buffer
exp.get_cape = function*(rid, userId) {
  let data = yield exp.get_image_hash(rid, userId, "cape");
  let status = data.status;
  let cape_hash = data.hash;
  let slim = data.slim;
  if (!cape_hash) {
    return {
      hash: null,
      status,
      image: null
    };
  }
  var capepath = path.join(config.directories.capes, cape_hash + ".png");
  try {
    yield fs.accessAsync(capepath);
    logging.debug(rid, "cape already exists, not downloading");
    let img = yield skins.open_skin(rid, capepath);
    return {
      hash: cape_hash,
      status,
      image: img
    };
  } catch (fs_err) {
    let data = yield promisify(networking.save_texture)(rid, cape_hash, capepath);
    let response = data.response;
    let img = data.img;
    if (response && response.statusCode === 404) {
      return {
        hash: cape_hash,
        status,
        image: null
      };
    } else {
      return {
        hash: cape_hash,
        status,
        image: img
      };
    }
  }
};

module.exports = exp;
