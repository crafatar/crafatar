var helpers = require("../helpers");
var config = require("../../config");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var url = require("url");

function handle_default(img_status, userId, size, def, req, err, callback) {
  def = def || skins.default_skin(userId);
  if (def !== "steve" && def !== "alex") {
    if (helpers.id_valid(def)) {
      // clean up the old URL to match new image
      var parsed = req.url;
      delete parsed.query.default;
      delete parsed.search;
      parsed.pathname = parsed.pathname.replace(userId, def);
      var newUrl = url.format(parsed);
      callback({
        status: img_status,
        redirect: newUrl,
        err: err
      });
    } else {
      callback({
        status: img_status,
        redirect: def,
        err: err
      });
    }
  } else {
    // handle steve and alex
    skins.resize_img(path.join(__dirname, "..", "public", "images", def + ".png"), size, function(resize_err, image) {
      callback({
        status: img_status,
        body: image,
        type: "image/png",
        hash: def,
        err: resize_err || err
      });
    });
  }
}

// GET avatar request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[1] || "").split(".")[0];
  var size = parseInt(req.url.query.size) || config.avatars.default_size;
  var def = req.url.query.default;
  var helm = req.url.query.hasOwnProperty("helm");

  // check for extra paths
  if (req.url.path_list.length > 2) {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404
    });
    return;
  }

  // Prevent app from crashing/freezing
  if (size < config.avatars.min_size || size > config.avatars.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    callback({
      status: -2,
      body: "Invalid Size"
    });
    return;
  } else if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UserID"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    helpers.get_avatar(req.id, userId, helm, size, function(err, status, image, hash) {
      if (err) {
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(req.id, userId);
        }
      }
      if (image) {
        callback({
          status: status,
          body: image,
          type: "image/png",
          err: err,
          hash: hash
        });
      } else {
        handle_default(status, userId, size, def, req, err, callback);
      }
    });
  } catch (e) {
    handle_default(-1, userId, size, def, req, e, callback);
  }
};