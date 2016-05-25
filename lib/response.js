'use strict';

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
// +this.result+ an object with:
//  * status:   see human_status, required for images without err
//  * redirect: redirect URL
//  * body:     file or message, required unless redirect is present or status is < 0
//  * type:     a valid Content-Type for the body, defaults to "text/plain"
//  * hash:     image hash, required when body is an image
//  * err:      a possible Error
module.exports = function* (next) {
  // These headers are the same for every response
  var responseHeaders = {
    "Content-Type": this.result.body && this.result.type || "text/plain",
    "Cache-Control": "max-age=" + config.caching.browser,
    "Response-Time": Date.now() - this.start,
    "X-Request-ID": this.id,
    "Access-Control-Allow-Origin": "*"
  };

  this.res.on("close", () => {
    logging.warn(this.id, "Connection closed");
  });

  this.res.on("finish", () => {
    logging.log(this.id, this.method, this.url.href, this.status, responseHeaders["Response-Time"] + "ms", "(" + (human_status[this.result.status] || "-") + ")");
  });

  this.res.on("error", err => {
    logging.error(this.id, err);
  });

  if (this.result.err) {
    var silent = silent_errors.indexOf(this.result.err.code) !== -1;
    if (this.result.err.stack && !silent) {
      logging.error(this.id, this.result.err.stack);
    } else if (silent) {
      logging.warn(this.id, this.result.err);
    } else {
      logging.error(this.id, this.result.err);
    }
    this.result.status = -1;
  }

  if (this.result.status !== undefined && this.result.status !== null) {
    responseHeaders["X-Storage-Type"] = human_status[this.result.status];
  }

  // use crc32 as a hash function for Etag
  var etag = "\"" + crc(this.result.body || "") + "\"";

  // handle etag caching
  var incoming_etag = this.headers["if-none-match"];
  // also respond with 304 on server error (use client's version)
  if (incoming_etag && (incoming_etag === etag || this.result.status === -1)) {
    this.status = 304;
    for(let header in  responseHeaders) {
        this.set(header, responseHeaders[header]);
    }
    yield next;
  }

  if (this.result.redirect) {
    responseHeaders.Location = this.result.redirect;
    this.status = 307;
    for(let header in  responseHeaders) {
        this.set(header, responseHeaders[header]);
    }
    yield next;
  }

  if (this.result.status === -2) {
    this.status = this.result.code || 422;
    for(let header in  responseHeaders) {
        this.set(header, responseHeaders[header]);
    }
  } else if (this.result.status === -1) {
    // 500 responses shouldn't be cached
    responseHeaders["Cache-Control"] = "private, max-age=0, no-cache";
    this.status = 500;
    for(let header in  responseHeaders) {
        this.set(header, responseHeaders[header]);
    }
  } else {
    if (this.result.body) {
      this.etag = etag;
      this.status = this.result.status === 2 ? 201 : 200;
      for(let header in  responseHeaders) {
          this.set(header, responseHeaders[header]);
      }
    } else {
      this.status = 404;
      for(let header in  responseHeaders) {
          this.set(header, responseHeaders[header]);
      }
    }
  }

  this.body = this.result.body;
  yield next;
};
