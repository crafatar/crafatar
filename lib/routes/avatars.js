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

// GET avatar request
module.exports = function(req, res) {
  var start = new Date();
  var userId = (req.url.path_list[2] || "").split(".")[0];
  var size = parseInt(req.url.query.size) || config.default_size;
  var def = req.url.query.default;
  var helm = req.url.query.hasOwnProperty("helm");
  var etag = null;
  var rid = req.id;

  function sendimage(rid, http_status, img_status, image) {
    logging.log(rid, "status:", http_status);
    res.writeHead(http_status, {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
      "Response-Time": new Date() - start,
      "X-Storage-Type": human_status[img_status],
      "X-Request-ID": rid,
      "Access-Control-Allow-Origin": "*",
      "Etag": '"' + etag + '"'
    });
    res.end(http_status === 304 ? null : image);
  }

  function handle_default(rid, http_status, img_status, userId) {
    if (def && def !== "steve" && def !== "alex") {
      logging.log(rid, "status: 301");
      res.writeHead(301, {
        "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
        "Response-Time": new Date() - start,
        "X-Storage-Type": human_status[img_status],
        "X-Request-ID": rid,
        "Access-Control-Allow-Origin": "*",
        "Location": def
      });
      res.end();
    } else {
      def = def || skins.default_skin(userId);
      skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
        sendimage(rid, http_status, img_status, image);
      });
    }
  }

  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("Invalid Size");
    return;
  } else if (!helpers.id_valid(userId)) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("Invalid ID");
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  logging.debug(rid, "userid:", userId);

  try {
    helpers.get_avatar(rid, userId, helm, size, function(err, status, image, hash) {
      logging.log(rid, "storage type:", human_status[status]);
      if (err) {
        logging.error(rid, err);
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(rid, userId);
        }
      }
      etag = image && hash && hash.substr(0, 32) || "none";
      var matches = req.headers["if-none-match"] === '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (err) {
          http_status = 503;
        }
        logging.debug(rid, "etag:", req.headers["if-none-match"]);
        logging.debug(rid, "matches:", matches);
        sendimage(rid, matches ? 304 : http_status, status, image);
      } else {
        handle_default(rid, matches ? 304 : 200, status, userId);
      }
    });
  } catch(e) {
    logging.error(rid, "error:", e.stack);
    handle_default(rid, 500, -1, userId);
  }
};