#!/usr/bin/env node
var querystring = require("querystring");
var response = require("./response");
var helpers = require("./helpers.js");
var toobusy = require("toobusy-js");
var logging = require("./logging");
var config = require("../config");
var http = require("http");
var mime = require("mime");
var path = require("path");
var url = require("url");
var fs = require("fs");
var server = null;

var routes = {
  index: require("./routes/index"),
  avatars: require("./routes/avatars"),
  skins: require("./routes/skins"),
  renders: require("./routes/renders"),
  capes: require("./routes/capes"),
};

// serves assets from lib/public
function asset_request(req, callback) {
  var filename = path.join(__dirname, "public", req.url.path_list.join("/"));
  fs.access(filename, function(fs_err) {
    if (!fs_err) {
      fs.readFile(filename, function(err, data) {
        callback({
          body: data,
          type: mime.getType(filename),
          err: err,
        });
      });
    } else {
      callback({
        body: "Not found",
        status: -2,
        code: 404,
      });
    }
  });
}

// generates a 12 character random string
function request_id() {
  return Math.random().toString(36).substring(2, 14);
}

// splits a URL path into an Array
// the path is resolved and decoded
function path_list(pathname) {
  // remove double and trailing slashes
  pathname = pathname.replace(/\/\/+/g, "/").replace(/(.)\/$/, "$1");
  var list = pathname.split("/");
  list.shift();
  for (var i = 0; i < list.length; i++) {
    // URL decode
    list[i] = querystring.unescape(list[i]);
  }
  return list;
}

// handles the +req+ by routing to the request to the appropriate module
function requestHandler(req, res) {
  req.url = url.parse(req.url, true);
  req.url.query = req.url.query || {};
  req.url.path_list = path_list(req.url.pathname);

  req.id = request_id();
  req.start = Date.now();

  var local_path = req.url.path_list[0];
  logging.debug(req.id, req.method, req.url.href);

  toobusy.maxLag(200);
  if (toobusy() && !process.env.TRAVIS) {
    response(req, res, {
      status: -1,
      body: "Server is over capacity :/",
      err: "Too busy",
      code: 503,
    });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    try {
      switch (local_path) {
      case "":
        routes.index(req, function(result) {
          response(req, res, result);
        });
        break;
      case "avatars":
        routes.avatars(req, function(result) {
          response(req, res, result);
        });
        break;
      case "skins":
        routes.skins(req, function(result) {
          response(req, res, result);
        });
        break;
      case "renders":
        routes.renders(req, function(result) {
          response(req, res, result);
        });
        break;
      case "capes":
        routes.capes(req, function(result) {
          response(req, res, result);
        });
        break;
      default:
        asset_request(req, function(result) {
          response(req, res, result);
        });
      }
    } catch(e) {
      var error = JSON.stringify(req.headers) + "\n" + e.stack;
      response(req, res, {
        status: -1,
        body: config.server.debug_enabled ? error : "Internal Server Error",
        err: error,
      });
    }
  } else {
    response(req, res, {
      status: -2,
      body: "Method Not Allowed",
      code: 405,
    });
  }
}

var exp = {};

// Start the server
exp.boot = function(callback) {
  var port = config.server.port;
  var bind_ip = config.server.bind;
  server = http.createServer(requestHandler).listen(port, bind_ip, function() {
    logging.log("Server running on http://" + bind_ip + ":" + port + "/");
    if (callback) {
      callback();
    }
  });

  // stop accepting new connections,
  // wait for established connections to finish (30s max),
  // then exit
  process.on("SIGTERM", function() {
    logging.warn("Got SIGTERM, no longer accepting new connections!");

    setTimeout(function() {
      logging.error("Dropping connections after 30s. Force quit.");
      process.exit(1);
    }, 30000);

    server.close(function() {
      logging.log("All connections closed, shutting down.");
      process.exit();
    });
  });
};

// Close the server
exp.close = function(callback) {
  helpers.stoplog();
  server.close(callback);
};

module.exports = exp;

if (require.main === module) {
  logging.error("Please use 'npm start' or 'www.js'");
  process.exit(1);
}