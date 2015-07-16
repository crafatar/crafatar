var logging = require("./logging");
var config = require("../config");
var crc = require("crc").crc32;

var human_status = {
  "-2": "user error",   // e.g. invalid size
  "-1": "server error", // e.g. network issues
  0: "none",            // cached as null (user has no skin)
  1: "cached",          // found on disk
  2: "downloaded",      // profile downloaded, skin downloaded from mojang servers
  3: "checked",         // profile re-downloaded (was too old), has no skin or skin cached
};


// handles HTTP responses
// +request+ a http.IncomingMessage
// +response+ a http.ServerResponse
// +result+ an object with:
//  * status:   see human_status, required for images without err
//  * redirect: redirect URL
//  * body:     file or message, required unless redirect is present or status is < 0
//  * type:     a valid Content-Type for the body, defaults to "text/plain"
//  * hash:     image hash, required when body is an image
//  * err:      a possible Error
module.exports = function(request, response, result) {

  response.on("close", function() {
    logging.warn(request.id, "Connection closed");
  });

  response.on("finish", function() {
    logging.log(request.method, request.url.href, request.id, response.statusCode, headers["Response-Time"] + "ms", "(" + (human_status[result.status] || "-") + ")");
  });

  response.on("error", function(err) {
    logging.error(request.id, err);
  });

  // These headers are the same for every response
  var headers = {
    "Content-Type": (result.body && result.type) || "text/plain",
    "Cache-Control": "max-age=" + config.caching.browser + ", public",
    "Response-Time": Date.now() - request.start,
    "X-Request-ID": request.id,
    "Access-Control-Allow-Origin": "*"
  };

  if (result.err) {
    logging.error(request.id, result.err);
    logging.error(request.id, result.err.stack);
    result.status = -1;
  }

  if (result.status !== undefined && result.status !== null) {
    headers["X-Storage-Type"] = human_status[result.status];
  }

  if (result.body) {
    // use Mojang's image hash if available
    // use crc32 as a hash function otherwise
    var etag = result.hash && result.hash.substr(0, 10) || crc(result.body);
    headers.Etag = "\"" + etag + "\"";

    // handle etag caching
    var incoming_etag = request.headers["if-none-match"];
    if (incoming_etag && incoming_etag === headers.Etag) {
      response.writeHead(304, headers);
      response.end();
      return;
    }
  }

  if (result.redirect) {
    headers.Location = result.redirect;
    response.writeHead(307, headers);
    response.end();
    return;
  }

  if (result.status === -2) {
    response.writeHead(422, headers);
    response.end(result.body);
  } else if (result.status === -1) {
    response.writeHead(500, headers);
    response.end(result.body);
  } else {
    response.writeHead(result.body ? 200 : 404, headers);
    response.end(result.body);
  }
};