var logging = require("../modules/logging");
var helpers = require("../modules/helpers");
var config = require("../modules/config");

var human_status = {
  0: "none",
  1: "cached",
  2: "downloaded",
  3: "checked",
  "-1": "error"
};

// GET cape request
module.exports = function(req, res) {
  var start = new Date();
  var id = (req.url.pathname.split("/")[2] || "").split(".")[0];
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
    helpers.get_cape(id, function(err, status, image, hash) {
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
        logging.debug("Etag: " + req.headers["if-none-match"]);
        logging.debug("matches: " + matches);
        logging.log("status: " + http_status);
        sendimage(http_status, status, image);
      } else {
        res.writeHead(404, {
          "Content-Type": "text/plain",
          "Response-Time": new Date() - start
        });
        res.end("404 not found");
      }
    });
  } catch(e) {
    logging.error(id + " error:");
    logging.error(e);
    res.writeHead(500, {
      "Content-Type": "text/plain",
      "Response-Time": new Date() - start
    });
    res.end("500 server error");
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
    res.end(http_status === 304 ? null : image);
  }
};
