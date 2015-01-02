var config = require("../modules/config");
var jade = require("jade");

// compile jade
var index = jade.compileFile(__dirname + "/../views/index.jade");

module.exports = function(req, res) {
  var html = index({
    title: "Crafatar",
    domain: "https://" + "req.hostname",
    config: config
  });
  res.writeHead(200, {
    "Content-Length": html.length
  });
  res.end(html);
};