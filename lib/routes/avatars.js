var logging = require("../logging");
var helpers = require("../helpers");
var config = require("../config");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");

function handle_default(img_status, userId, size, def, callback) {
  if (def && def !== "steve" && def !== "alex") {
    callback({
      status: img_status,
      redirect: def
    });
  } else {
    def = def || skins.default_skin(userId);
    skins.resize_img(path.join(__dirname, "..", "public", "images", def + ".png"), size, function(err, image) {
      callback({
        status: img_status,
        body: image,
        type: "image/png",
        err: err
      });
    });
  }
}

// GET avatar request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[2] || "").split(".")[0];
  var size = parseInt(req.url.query.size) || config.default_size;
  var def = req.url.query.default;
  var helm = req.url.query.hasOwnProperty("helm");

  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
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
      body: "Invalid userid"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  logging.debug(req.id, "userid:", userId);

  try {
    helpers.get_avatar(req.id, userId, helm, size, function(err, status, image, hash) {
      if (err) {
        logging.error(req.id, err);
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
        handle_default(status, userId, size, def, callback);
      }
    });
  } catch(e) {
    logging.error(req.id, "error:", e.stack);
    handle_default(-1, userId, size, def, callback);
  }
};