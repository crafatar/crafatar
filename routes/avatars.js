var router = require("express").Router();
var networking = require("../modules/networking");
var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");
var skins = require("../modules/skins");

var human_status = {
  0: "none",
  1: "cached",
  2: "downloaded",
  3: "checked",
  "-1": "error"
};

/* GET avatar request. */
router.get("/:uuid.:ext?", function(req, res) {
  var uuid = (req.params.uuid || "");
  var size = parseInt(req.query.size) || config.default_size;
  var def = req.query.default;
  var helm = req.query.hasOwnProperty("helm");
  var start = new Date();
  var etag = null;

  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    res.status(422).send("422 Invalid size");
    return;
  } else if (!helpers.uuid_valid(uuid)) {
    res.status(422).send("422 Invalid UUID");
    return;
  }

  // strip dashes
  uuid = uuid.replace(/-/g, "");

  try {
    helpers.get_avatar(uuid, helm, size, function(err, status, image, hash) {
      logging.log(uuid + " - " + human_status[status]);
      if (err) {
        logging.error(err);
      }
      etag = hash && hash.substr(0, 32) || "none";
      var matches = req.get("If-None-Match") == "'" + etag + "'";
      if (image) {
        var http_status = 200;
        if (matches) {
          http_status = 304;
        } else if (err) {
          http_status = 503;
        }
        logging.debug("Etag: " + req.get("If-None-Match"));
        logging.debug("matches: " + matches);
        logging.log("status: " + http_status);
        sendimage(http_status, status, image);
      } else {
        handle_default(404, status);
      }
    });
  } catch(e) {
    logging.error("Error!");
    logging.error(e);
    handle_default(500, status);
  }

  function handle_default(http_status, img_status) {
    if (def && def != "steve" && def != "alex") {
      res.writeHead(301, {
        "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
        "Response-Time": new Date() - start,
        "X-Storage-Type": human_status[img_status],
        "Access-Control-Allow-Origin": "*",
        "Location": def
      });
      res.end();
    } else {
      def = def || skins.default_skin(uuid);
      skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
        sendimage(http_status, img_status, image);
      });
    }
  }

  function sendimage(http_status, img_status, image) {
    res.writeHead(http_status, {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
      "Response-Time": new Date() - start,
      "X-Storage-Type": human_status[img_status],
      "Access-Control-Allow-Origin": "*",
      "Etag": '"' + etag + '"'
    });
    res.end(http_status == 304 ? null : image);
  }
});


module.exports = router;