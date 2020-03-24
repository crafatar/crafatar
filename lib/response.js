var logging = require("./logging");
var config = require("../config");
var crc = require("crc").crc32;

var human_status = {
  "-2": "user error",   // e.g. invalid size
  "-1": "server error", // e.g. mojang/network issues
  0: "none",            // cached as null (user has no skin)
  1: "cached",          // found on disk
  2: "downloaded",      // profile downloaded, skin downloaded from mojang servers
  3: "checked",         // profile re-downloaded (was too old), has no skin or skin cached
};


// print these, but without stacktrace
var silent_errors = ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "EHOSTUNREACH", "ECONNREFUSED", "HTTPERROR"];

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
//  * code:     override HTTP response code when status is < 0
module.exports = function(request, response, result) {
  // These headers are the same for every response
  var headers = {
    "Content-Type": result.body && result.type || "text/plain",
    "Cache-Control": "max-age=" + config.caching.browser,
    "Response-Time": Date.now() - request.start,
    "X-Request-ID": request.id,
    "Access-Control-Allow-Origin": "*",
  };

  response.on("finish", function() {
    logging.log(request.id, request.method, request.url.href, response.statusCode, headers["Response-Time"] + "ms", "(" + (human_status[result.status] || "-") + ")");
  });

  response.on("error", function(err) {
    logging.error(request.id, err);
  });

  if (result.err) {
    var silent = silent_errors.indexOf(result.err.code) !== -1;
    if (result.err.stack && !silent) {
      logging.error(request.id, result.err.stack);
    } else if (silent) {
      logging.warn(request.id, result.err);
    } else {
      logging.error(request.id, result.err);
    }
    result.status = -1;
  }

  if (result.status !== undefined && result.status !== null) {
    headers["X-Storage-Type"] = human_status[result.status];
  }

  // use crc32 as a hash function for Etag
  var etag = "\"" + crc(result.body || "") + "\"";

  // handle etag caching
  var incoming_etag = request.headers["if-none-match"];
  // also respond with 304 on server error (use client's version)
  // don't respond with 304 when debugging is enabled
  if (incoming_etag && (incoming_etag === etag || result.status === -1 && !config.server.debug_enabled)) {
    response.writeHead(304, headers);
    response.end();
    return;
  }

  if (result.redirect) {
    headers.Location = result.redirect;
    response.writeHead(307, headers);
    response.end();
    return;
  }

  if (result.status === -2) {
    response.writeHead(result.code || 422, headers);
  } else if (result.status === -1) {
    // 500 responses shouldn't be cached
    headers["Cache-Control"] = "private, max-age=0, no-cache";
    response.writeHead(result.code || 500, headers);
  } else {
    if (result.body) {
      headers.Etag = etag;
      response.writeHead(result.status === 2 ? 201 : 200, headers);
    } else {
      response.writeHead(404, headers);
    }
  }

  response.end(result.body);
};