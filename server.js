#!/usr/bin/env node
var config = require("./modules/config");
var logging = require("./modules/logging");
var clean = require("./modules/cleaner");
var app = require("./app");

app.set("port", process.env.PORT || 3000);

var server = app.listen(app.get("port"), function() {
  logging.debug("Crafatar server listening on port " + server.address().port);
});

// cleaning worker
setInterval(clean.run, config.cleaning_interval * 1000);