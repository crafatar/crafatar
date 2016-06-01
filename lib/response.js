'use strict';

var logging = require("./logging");
var config = require("../config");
var crc = require("crc").crc32;
let Boom = require('boom');

var human_status = {
  "-2": "user error",   // e.g. invalid size
  "-1": "server error", // e.g. mojang/network issues
  0: "none",            // cached as null (user has no skin)
  1: "cached",          // found on disk
  2: "downloaded",      // profile downloaded, skin downloaded from mojang servers
  3: "checked",         // profile re-downloaded (was too old), has no skin or skin cached
};


// print these, but without stacktrace
const silent_errors = ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "EHOSTUNREACH", "ECONNREFUSED", "HTTPERROR"];

// Response middleware to handle Boom errors, add appropriate headers, etc.
//  * crafatarStatus:   see human_status, required for images without err
//  * redirect: redirect URL
//  * body:     file or message, required unless redirect is present or status is < 0
//  * type:     a valid Content-Type for the body, defaults to "text/plain"
//  * hash:     image hash, required when body is an image
//  * err:      a possible Error
module.exports = function* (next) {
    // These headers are the same for every response
    let responseHeaders = {
        "Content-Type": this.body && this.contentType || "text/plain",
        "Cache-Control": "max-age=" + config.caching.browser,
        "Response-Time": Date.now() - this.start,
        "X-Request-ID": this.id,
        "Access-Control-Allow-Origin": "*"
    };
    
    if (this.crafatarStatus !== undefined && this.crafatarStatus !== null) {
        responseHeaders["X-Storage-Type"] = human_status[this.crafatarStatus];
    }
    
    if (this.redirectTo) {
        responseHeaders.Location = this.redirectTo;
        this.status = 307;
    }
    
    try {
        yield next;
    } catch(err) {
        let boomErr;
        if(err.isBoom) {
            boomErr = err;
        } else {
            logging.warn('Unhandled error: ', err);
            boomErr = Boom.badImplementation('Unhandled error');
        }
        this.status = boomErr.output.statusCode;
        this.body = boomErr.output.payload;
        
        if(boomErr.isServer) {
            // 500 responses shouldn't be cached
            responseHeaders["Cache-Control"] = "private, max-age=0, no-cache";
        }
    }
    
    // This needs to be after boom error handling since it relies on a check on the status
    // use crc32 as a hash function for Etag
    let etag;
    if(this.status < 400) {
        etag = "\"" + crc(this.body || "") + "\"";
    }
    
    // handle etag caching
    let incoming_etag = this.headers["if-none-match"];
    // also respond with 304 on server error (use client's version)
    if (incoming_etag && (incoming_etag === etag || this.status === 500)) {
        this.status = 304;
        this.etag = incoming_etag;
    }
    
    for(let header in  responseHeaders) {
        this.set(header, responseHeaders[header]);
    }

  this.res.on("finish", () => {
    logging.log(this.id, this.method, this.url.href, this.status, responseHeaders["Response-Time"] + "ms", "(" + (human_status[this.crafatarStatus] || "-") + ")");
  });

  // if (this.result.err) {
  //   var silent = silent_errors.indexOf(this.result.err.code) !== -1;
  //   if (this.result.err.stack && !silent) {
  //     logging.error(this.id, this.result.err.stack);
  //   } else if (silent) {
  //     logging.warn(this.id, this.result.err);
  //   } else {
  //     logging.error(this.id, this.result.err);
  //   }
  //   this.result.status = -1;
  // }

  yield next;
};
