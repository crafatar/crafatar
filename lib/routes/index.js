var logging = require("../logging");
var config = require("../../config");
var path = require("path");
var read = require("fs").readFileSync;
var ejs = require("ejs");

var str;
var index;

// pre-compile the index page
function compile() {
  logging.log("Compiling index page");
  str = read(path.join(__dirname, "..", "views", "index.html.ejs"), "utf-8");
  index = ejs.compile(str);
}

compile();

// GET index request
module.exports = function(req, callback) {
  if (config.server.debug_enabled) {
    // allow changes without reloading
    compile();
  }
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