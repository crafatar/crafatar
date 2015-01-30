var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");
var skins = require("../modules/skins");
var cache = require("../modules/cache");

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
  var id = (req.url.path_list[2] || "").split(".")[0];
  var size = parseInt(req.url.query.size) || config.default_size;
  var def = req.url.query.default;
  var helm = req.url.query.hasOwnProperty("helm");
  var etag = null;

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
  } else if (!helpers.id_valid(id)) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("Invalid ID");
    return;
  }

  // strip dashes
  id = id.replace(/-/g, "");

  try {
    helpers.get_avatar(id, helm, size, function(err, status, image, hash) {
      logging.log(id + " - " + human_status[status]);
      if (err) {
        logging.error(id + " " + err);
        if (err.code === "ENOENT") {
          cache.remove_hash(id);
        }
      }
      etag = image && hash && hash.substr(0, 32) || "none";
      var matches = req.headers["if-none-match"] === '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (matches) {
          http_status = 304;
        } else if (err) {
          http_status = 503;
        }
        logging.debug(id + " etag: " + req.headers["if-none-match"]);
        logging.debug(id + " matches: " + matches);
        sendimage(http_status, status, image, id);
      } else {
        handle_default(404, status, id);
      }
    });
  } catch(e) {
    logging.error(id + " error: " + e);
    handle_default(500, status, id);
  }

  function handle_default(http_status, img_status, id) {
    if (def && def !== "steve" && def !== "alex") {
      logging.log(id + " status: 301");
      res.writeHead(301, {
        "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
        "Response-Time": new Date() - start,
        "X-Storage-Type": human_status[img_status],
        "Access-Control-Allow-Origin": "*",
        "Location": def
      });
      res.end();
    } else {
      def = def || skins.default_skin(id);
      skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
        sendimage(http_status, img_status, image, id);
      });
    }
  }

  function sendimage(http_status, img_status, image, id) {
    logging.log(id + " status: " + http_status);
    res.writeHead(http_status, {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
      "Response-Time": new Date() - start,
      "X-Storage-Type": human_status[img_status],
      "Access-Control-Allow-Origin": "*",
      "Etag": '"' + etag + '"'
    });
    res.end(http_status === 304 ? null : image);
  }
};
