var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");
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
  var id = (req.url.path_list[3] || "").split(".")[0];
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
  } else if (!helpers.id_valid(id)) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("422 Invalid ID");
    return;
  }

  // strip dashes
  id = id.replace(/-/g, "");

  try {
    helpers.get_render(id, scale, helm, body, function(err, status, hash, image) {
      logging.log(id + " - " + human_status[status]);
      if (err) {
        logging.error(id + " " + err);
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
        logging.debug(id + " etag: " + req.headers["if-none-match"]);
        logging.debug(id + " matches: " + matches);
        sendimage(http_status, status, image, uuid);
      } else {
        logging.log(id + " image not found, using default.");
        handle_default(404, status, uuid);
      }
    });
  } catch(e) {
    logging.error(id + " error: " + e);
    handle_default(500, status, uuid);
  }


  // default alex/steve images can be rendered, but
  // custom images will not be
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
      fs.readFile("public/images/" + def + "_skin.png", function (err, buf) {
        if (err) {
          // errored while loading the default image, continuing with null image
          logging.error(id + "error loading default render image: " + err);
        }
        // we render the default skins, but not custom images
        renders.draw_model(id, buf, scale, helm, body, function(err, def_img) {
          if (err) {
            logging.log(id + "error while rendering default image: " + err);
          }
          sendimage(http_status, img_status, def_img, id);
        });
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