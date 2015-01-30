var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");
var skins = require("../modules/skins");
var lwip = require("lwip");

// GET skin request
module.exports = function(req, res) {
  var start = new Date();
  var id = (req.url.path_list[2] || "").split(".")[0];
  var def = req.url.query.default;
  var etag = null;

  if (!helpers.id_valid(id)) {
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
    helpers.get_skin(id, function(err, hash, image) {
      logging.log(id);
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
        sendimage(http_status, image, id);
      } else {
        handle_default(404, id);
      }
    });
  } catch(e) {
    logging.error(id + " error: " + e);
    handle_default(500, id);
  }

  function handle_default(http_status, id) {
    if (def && def !== "steve" && def !== "alex") {
      logging.log(id + " status: 301");
      res.writeHead(301, {
        "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
        "Response-Time": new Date() - start,
        "X-Storage-Type": "downloaded",
        "Access-Control-Allow-Origin": "*",
        "Location": def
      });
      res.end();
    } else {
      def = def || skins.default_skin(id);
      lwip.open("public/images/" + def + "_skin.png", function(err, image) {
        image.toBuffer("png", function(err, buffer) {
          sendimage(http_status, buffer, id);
        });
      });
    }
  }

  function sendimage(http_status, image, id) {
    logging.log(id + " status: " + http_status);
    res.writeHead(http_status, {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
      "Response-Time": new Date() - start,
      "X-Storage-Type": "downloaded",
      "Access-Control-Allow-Origin": "*",
      "Etag": '"' + etag + '"'
    });
    res.end(http_status === 304 ? null : image);
  }
};