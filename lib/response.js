var logging = require("./logging");
var config = require("../config");
var crc = require("crc").crc32;

var human_status = {
  "-2": "user error",        // e.g. invalid size
  "-1": "server error",      // e.g. mojang/network issues
  0: "none",                 // cached as null (user has no skin)
  1: "cached",               // found on disk
  2: "downloaded",           // profile downloaded, skin downloaded from mojang servers
  3: "checked",              // profile re-downloaded (was too old), has no skin or skin cached
  4: "server error;cached" // tried to check but ran into server error, using cached version
};


// print these, but without stacktrace
var silent_errors = ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "EHOSTUNREACH", "ECONNREFUSED", "HTTPERROR", "RATELIMIT"];

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
    "Content-Length": Buffer.from(result.body || "").length,
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
    // server errors shouldn't be cached
    headers["Cache-Control"] = "no-cache, max-age=0";
    if (result.body && result.hash && !result.hash.startsWith("mhf_")) {
      headers["Warning"] = '110 Crafatar "Response is Stale"'
      headers["Etag"] = etag;
      result.code = result.code || 200;
    }
    if (result.err && result.err.code === "ENOENT") {
      result.code = result.code || 500;
    }
    if (!result.code) {
      // Don't use 502 on Cloudflare
      // As they will show their own error page instead
      // https://support.cloudflare.com/hc/en-us/articles/200172706
      result.code = config.caching.cloudflare ? 500 : 502;
    }
    response.writeHead(result.code, headers);
  } else {
    if (result.body) {
      if (result.status === 4) {
        headers["Warning"] = '111 Crafatar "Revalidation Failed"'
      }
      headers["Etag"] = etag;
      response.writeHead(200, headers);
    } else {
      response.writeHead(404, headers);
    }
  }

  response.end(result.body);
};