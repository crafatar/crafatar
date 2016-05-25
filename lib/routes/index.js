'use strict';

let logging = require("../logging");
let config = require("../../config");
let path = require("path");
let read = require("fs").readFileSync;
let ejs = require("ejs");

let index;

exports.init = function(router) {
  router.get('/', getIndex);
  compile();
}

function* getIndex() {
  if (config.server.debug_enabled) {
    // allow changes without reloading
    compile();
  }
  let html = index({
    title: "Crafatar",
    domain: "https://" + this.request.header.host,
    config: config
  });

  this.status = 200;
  this.body = html;
  this.set('Content-Type', 'text/html; charset=utf-8')
}

function compile() {
  logging.log("Compiling index page");
  let str = read(path.join(__dirname, "..", "views", "index.html.ejs"), "utf-8");
  index = ejs.compile(str);
}
