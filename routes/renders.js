var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");
var cache = require("../modules/cache");
var skins = require("../modules/skins");
var renders = require("../modules/renders");
var fs = require("fs");

var human_status = {
  0: "none",
  1: "cached",
  2: "downloaded",
  3: "checked",
  "-1": "error"
};

// valid types: head, body
// helmet is query param
// TODO: The Type logic should be two separate GET functions once response methods are extracted

// GET render request
module.exports = function(req, res) {
  var start = new Date();
  var raw_type = (req.url.path_list[2] || "");
  var rid = req.id;

  // validate type
  if (raw_type !== "body" && raw_type !== "head") {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("Invalid Render Type");
    return;
  }

  var body = raw_type === "body";
  var userId = (req.url.path_list[3] || "").split(".")[0];
  var def = req.url.query.default;
  var scale = parseInt(req.url.query.scale) || config.default_scale;
  var helm = req.url.query.hasOwnProperty("helm");
  var etag = null;

  if (scale < config.min_scale || scale > config.max_scale) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("422 Invalid Scale");
    return;
  } else if (!helpers.id_valid(userId)) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("422 Invalid ID");
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  logging.log(rid + "userId: " + userId);

  try {
    helpers.get_render(rid, userId, scale, helm, body, function(err, status, hash, image) {
      logging.log(rid + "storage type: " + human_status[status]);
      if (err) {
        logging.error(rid + err);
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(rid, userId);
        }
      }
      etag = hash && hash.substr(0, 32) || "none";
      var matches = req.headers["if-none-match"] === '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (matches) {
          http_status = 304;
        } else if (err) {
          http_status = 503;
        }
        logging.debug(rid + "etag: " + req.headers["if-none-match"]);
        logging.debug(rid + "matches: " + matches);
        sendimage(rid, http_status, status, image);
      } else {
        logging.log(rid + "image not found, using default.");
        handle_default(rid, 404, status, userId);
      }
    });
  } catch(e) {
    logging.error(rid + "error: " + e.stack);
    handle_default(rid, 500, -1, userId);
  }


  // default alex/steve images can be rendered, but
  // custom images will not be
  function handle_default(rid, http_status, img_status, userId) {
    if (def && def !== "steve" && def !== "alex") {
      logging.log(rid + "status: 301");
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
      fs.readFile("public/images/" + def + "_skin.png", function (err, buf) {
        if (err) {
          // errored while loading the default image, continuing with null image
          logging.error(rid + "error loading default render image: " + err);
        }
        // we render the default skins, but not custom images
        renders.draw_model(rid, buf, scale, helm, body, function(err, def_img) {
          if (err) {
            logging.log(rid + "error while rendering default image: " + err);
          }
          sendimage(rid, http_status, img_status, def_img);
        });
      });
    }
  }

  function sendimage(rid, http_status, img_status, image) {
    logging.log(rid + "status: " + http_status);
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
};