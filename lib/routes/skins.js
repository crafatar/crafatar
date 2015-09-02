var logging = require("../logging");
var helpers = require("../helpers");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var lwip = require("lwip");
var url = require("url");

function handle_default(img_status, userId, def, req, err, callback) {
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
    lwip.open(path.join(__dirname, "..", "public", "images", def + "_skin.png"), function(lwip_err, image) {
      if (image) {
        image.toBuffer("png", function(buf_err, buffer) {
          callback({
            status: img_status,
            body: buffer,
            type: "image/png",
            hash: def,
            err: buf_err || lwip_err || err
          });
        });
      } else {
        callback({
          status: -1,
          err: lwip_err || err
        });
      }
    });
  }
}

// GET skin request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[1] || "").split(".")[0];
  var def = req.url.query.default;
  var rid = req.id;

  // check for extra paths
  if (req.url.path_list.length > 2) {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404
    });
    return;
  }

  if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UserID"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    helpers.get_skin(rid, userId, function(err, hash, status, image) {
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
          hash: hash,
          err: err
        });
      } else {
        handle_default(2, userId, def, req, err, callback);
      }
    });
  } catch(e) {
    logging.error(rid, "error:", e.stack);
    handle_default(-1, userId, def, req, e, callback);
  }
};