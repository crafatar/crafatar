var config = require("../modules/config");
var jade = require("jade");

// compile jade
var index = jade.compileFile(__dirname + "/../views/index.jade");

module.exports = function(req, res) {
  var html = index({
    title: "Crafatar",
    domain: "https://" + req.headers.host,
    config: config
  });
  res.writeHead(200, {
    "Content-Length": Buffer.byteLength(html, "UTF-8"),
    "Content-Type": "text/html; charset=utf-8"
  });
  res.end(html);
};