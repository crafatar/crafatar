var config = require("../../config");
var path = require("path");
var read = require("fs").readFileSync;
var ejs = require("ejs");

var str = read(path.join(__dirname, "..", "views", "index.html.ejs"), "utf-8");
var index = ejs.compile(str);

module.exports = function(req, callback) {
  var html = index({
    title: "Crafatar",
    domain: "https://" + req.headers.host,
    config: config
  });
  callback({
    body: html,
    type: "text/html; charset=utf-8"
  });
};