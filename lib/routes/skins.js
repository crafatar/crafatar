var logging = require("../logging");
var helpers = require("../helpers");
var config = require("../config");
var skins = require("../skins");
var path = require("path");
var lwip = require("lwip");

// GET skin request
module.exports = function(req, res) {
  var start = new Date();
  var userId = (req.url.path_list[2] || "").split(".")[0];
  var def = req.url.query.default;
  var etag = null;
  var rid = req.id;

  function sendimage(rid, http_status, image) {
    logging.log(rid, "status:", http_status);
    res.writeHead(http_status, {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
      "Response-Time": new Date() - start,
      "X-Storage-Type": "downloaded",
      "X-Request-ID": rid,
      "Access-Control-Allow-Origin": "*",
      "Etag": '"' + etag + '"'
    });
    res.end(http_status === 304 ? null : image);
  }

  function handle_default(rid, http_status, userId) {
    if (def && def !== "steve" && def !== "alex") {
      logging.log(rid, "status: 301");
      res.writeHead(301, {
        "Cache-Control": "max-age=" + config.browser_cache_time + ", public",
        "Response-Time": new Date() - start,
        "X-Storage-Type": "downloaded",
        "X-Request-ID": rid,
        "Access-Control-Allow-Origin": "*",
        "Location": def
      });
      res.end();
    } else {
      def = def || skins.default_skin(userId);
      lwip.open(path.join(__dirname, "..", "public", "images", def + "_skin.png"), function(err, image) {
        // FIXME: err is not handled
        image.toBuffer("png", function(buf_err, buffer) {
          // FIXME: buf_err is not handled
          sendimage(rid, http_status, buffer);
        });
      });
    }
  }

  if (!helpers.id_valid(userId)) {
    res.writeHead(422, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("Invalid ID");
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  logging.log(rid, "userid:", userId);

  try {
    helpers.get_skin(rid, userId, function(err, hash, image) {
      if (err) {
        logging.error(rid, err);
      }
      etag = hash && hash.substr(0, 32) || "none";
      var matches = req.headers["if-none-match"] === '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (err) {
          http_status = 503;
        }
        logging.debug(rid, "etag:", req.headers["if-none-match"]);
        logging.debug(rid, "matches:", matches);
        sendimage(rid, matches ? 304 : http_status, image);
      } else {
        handle_default(rid, 200, userId);
      }
    });
  } catch(e) {
    logging.error(rid, "error:", e.stack);
    handle_default(rid, 500, userId);
  }
};