#!/usr/bin/env node
var logging = require("./modules/logging");
var querystring = require("querystring");
var config = require("./modules/config");
var clean = require("./modules/cleaner");
var http = require("http");
var mime = require("mime");
var path = require("path");
var url = require("url");
var fs = require("fs");

var routes = {
  index: require("./routes/index"),
  avatars: require("./routes/avatars"),
  skins: require("./routes/skins"),
  renders: require("./routes/renders")
};

function asset_request(req, res) {
  var filename = __dirname + "/public/" + req.url.path_list.join("/");
  fs.exists(filename, function(exists) {
    if (exists) {
      fs.readFile(filename, function(err, file_buffer) {
        if (err) {
          res.writeHead(500, {"Content-type" : "text/plain"});
          res.end("Internal Server Error");
        } else {
          res.writeHead(200, {
            "Content-type" : mime.lookup(filename),
            "Content-Length": file_buffer.length
          });
          res.end(file_buffer);
        }
      });
    } else {
      res.writeHead(404, {
        "Content-type" : "text/plain"
      });
      res.end("Not Found");
    }
  });
}

function requestHandler(req, res) {
  var query = url.parse(req.url).query;
  var request = req;
  // we need to use url.parse and give the result to url.parse because nodejs
  request.url = url.parse(req.url, query);
  request.url.query = request.url.query || {};

  // remove trailing and double slashes + other junk
  var path_list = path.resolve(request.url.pathname).split("/");
  for (var i = 0; i < path_list.length; i++) {
    // URL decode
    path_list[i] = querystring.unescape(path_list[i]);
  }
  request.url.path_list = path_list;

  var local_path = request.url.path_list[1];
  console.log(request.method + " " + request.url.href);
  if (request.method == "GET" || request.method == "HEAD") {
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
        default:
          asset_request(request, res);
      }
    } catch(e) {
      var error = JSON.stringify(req.headers) + "\n" + e.stack;
      logging.error("Error: " + error);
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

http.createServer(requestHandler).listen(process.env.PORT || 3000);

// cleaning worker
setInterval(clean.run, config.cleaning_interval * 1000);