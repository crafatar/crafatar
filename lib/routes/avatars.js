var logging = require("../logging");
var helpers = require("../helpers");
var config = require("../config");
var skins = require("../skins");
var cache = require("../cache");

var human_status = {
  0: "none",
  1: "cached",
  2: "downloaded",
  3: "checked",
  "-1": "error"
};

function handle_default(http_status, img_status, userId, size, def, callback) {
  if (def && def !== "steve" && def !== "alex") {
    callback(http_status, img_status, def);
  } else {
    def = def || skins.default_skin(userId);
    skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
      callback(http_status, img_status, image);
    });
  }
}

// GET avatar request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[2] || "").split(".")[0];
  var size = parseInt(req.url.query.size) || config.default_size;
  var def = req.url.query.default;
  var helm = req.url.query.hasOwnProperty("helm");
  var etag = null;

  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    callback(422, 0, "Invalid Size");
    return;
  } else if (!helpers.id_valid(userId)) {
    callback(422, 0, "Invalid ID");
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  logging.debug(req.id, "userid:", userId);

  try {
    helpers.get_avatar(req.id, userId, helm, size, function(err, status, image, hash) {
      logging.log(req.id, "storage type:", human_status[status]);
      if (err) {
        logging.error(req.id, err);
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(req.id, userId);
        }
      }
      etag = image && hash && hash.substr(0, 32) || "none";
      var matches = req.headers["if-none-match"] === '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (err) {
          http_status = 503;
        }
        logging.debug(req.id, "etag:", req.headers["if-none-match"]);
        logging.debug(req.id, "matches:", matches);
        callback(matches ? 304 : http_status, status, image);
      } else {
        handle_default(matches ? 304 : 200, status, userId, size, def, callback);
      }
    });
  } catch(e) {
    logging.error(req.id, "error:", e.stack);
    handle_default(500, -1, userId, size, def, callback);
  }
};