#!/usr/bin/env node
var config = require("./modules/config");
var debug = require("debug")("crafatar");
var clean = require("./modules/cleaner");
var app = require("./app");

app.set("port", process.env.PORT || 3000);

var server = app.listen(app.get("port"), function() {
  debug("Crafatar server listening on port " + server.address().port);
});

// cleaning worker
setInterval(clean.run, config.cleaning_interval * 1000);