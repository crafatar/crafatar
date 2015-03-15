#!/usr/bin/env node
var logging = require("./lib/logging");
var querystring = require("querystring");
var config = require("./lib/config");
var http = require("http");
var mime = require("mime");
var url = require("url");
var fs = require("fs");
var server = null;

var routes = {
  index: require("./routes/index"),
  avatars: require("./routes/avatars"),
  skins: require("./routes/skins"),
  renders: require("./routes/renders"),
  capes: require("./routes/capes")
};

function asset_request(req, res) {
  var filename = __dirname + "/public/" + req.url.path_list.join("/");
  fs.exists(filename, function(exists) {
    if (exists) {
      res.writeHead(200, { "Content-type" : mime.lookup(filename) });
      fs.createReadStream(filename).pipe(res);
    } else {
      res.writeHead(404, {
        "Content-type" : "text/plain"
      });
      res.end("Not Found");
    }
  });
}

function requestHandler(req, res) {
  var request = req;
  request.url = url.parse(req.url, true);
  request.url.query = request.url.query || {};

  // remove trailing and double slashes + other junk
  var path_list = request.url.pathname.split("/");
  for (var i = 0; i < path_list.length; i++) {
    // URL decode
    path_list[i] = querystring.unescape(path_list[i]);
  }
  request.url.path_list = path_list;

  // generate 12 character random string
  request.id = Math.random().toString(36).substring(2,14);

  var local_path = request.url.path_list[1];
  logging.log(request.id + request.method, request.url.href);
  if (request.method === "GET" || request.method === "HEAD") {
    try {
      switch (local_path) {
        case "":
        routes.index(request, res);
        break;
        case "avatars":
        routes.avatars(request, res);
        break;
        case "skins":
        routes.skins(request, res);
        break;
        case "renders":
        routes.renders(request, res);
        break;
        case "capes":
        routes.capes(request, res);
        break;
        default:
        asset_request(request, res);
      }
    } catch(e) {
      var error = JSON.stringify(req.headers) + "\n" + e.stack;
      logging.error(request.id + "Error:", error);
      res.writeHead(500, {
        "Content-Type": "text/plain"
      });
      res.end(config.debug_enabled ? error : "Internal Server Error");
    }
  } else {
    res.writeHead(405, {
      "Content-Type": "text/plain"
    });
    res.end("Method Not Allowed");
  }
}

var exp = {};

exp.boot = function(callback) {
  var port = process.env.PORT || 3000;
  var bind_ip = process.env.BIND || "0.0.0.0";
  logging.log("Server running on http://" + bind_ip + ":" + port + "/");
  server = http.createServer(requestHandler).listen(port, bind_ip, function() {
    if (callback) {
      callback();
    }
  });
};

exp.close = function(callback) {
  server.close(function() {
    callback();
  });
};

module.exports = exp;

if (require.main === module) {
  logging.error("Please use 'npm start' or 'bin/www.js'");
  process.exit(1);
}