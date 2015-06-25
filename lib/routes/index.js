var config = require("../../config");
var path = require("path");
var jade = require("jade");

// compile jade
var index = jade.compileFile(path.join(__dirname, "..", "views", "index.jade"));

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