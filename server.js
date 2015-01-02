#!/usr/bin/env node
var config = require("./modules/config");
var logging = require("./modules/logging");
var clean = require("./modules/cleaner");
var http = require("http");
var mime = require("mime");
var url = require("url");
var fs = require("fs");

var routes = {
  index: require("./routes/index"),
  avatars: require("./routes/avatars"),
  skins: require("./routes/skins"),
  renders: require("./routes/renders")
};

function asset_request(req, res) {
  var filename = __dirname + "/public/" + req.url.pathname;
  fs.exists(filename, function(exists) {
    if (exists) {
      fs.readFile(filename, function(err, contents) {
        if (err) {
          res.writeHead(500, {"Content-type" : "text/plain"});
          res.end("Internal server error");
        } else {
          res.writeHead(200, {
            "Content-type" : mime.lookup(filename),
            "Content-Length": contents.length
          });
          res.end(contents);
        }
      });
    } else {
      res.writeHead(404, {
        "Content-type" : "text/plain"
      });
      res.end("Not found");
    }
  });
}

function requestHandler(req, res) {
  var querystring = url.parse(req.url).query;
  var request = req;
  // we need to use url.parse and give the result to url.parse because nodejs
  request.url = url.parse(req.url, querystring);
  request.url.query = request.url.query || {};

  var local_path = request.url.pathname.split("/")[1];
  console.log("Request: " + request.url.pathname + " (" + local_path + ")");
  console.log(request.headers);

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
}

http.createServer(requestHandler).listen(process.env.PORT || 3000);

// cleaning worker
setInterval(clean.run, config.cleaning_interval * 1000);