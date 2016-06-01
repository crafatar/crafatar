#!/usr/bin/env node

'use strict';

let logging = require("./logging");
let path = require("path");
let http = require('http');
let koa = require('koa');
let koaLogger = require('koa-logger');
let toobusy = require("koa-toobusy");
let staticServer = require('koa-static-server');
let Router = require('koa-router');

let app = koa();
app.use(koaLogger());
// Serve static assets from lib/public
app.use(staticServer({
  rootDir: path.join(__dirname, 'public')
}));
// Make sure the app doesn't die from too many requests
app.use(toobusy({
  maxLag: 200
}));
// Attach an ID and timestamp to each request
app.use(function*(next) {
  this.id = Math.random().toString(36).substring(2, 14);
  this.start = Date.now();
  yield next;
});

let router = new Router();
const routes = ['index', 'avatars', 'skins', 'capes', 'renders'];
routes.forEach(function(route) {
  logging.log('Loading ' + route + ' route...');
  require(path.join(__dirname, 'routes', route)).init(router);
});

// Response middleware has to be before routes to catch errors
app.use(require('./response'));

app.use(router.routes());

let server = http.createServer(app.callback());
let exp = {};
exp.boot = function(callback) {
  let port = process.env.PORT || 3000;
  logging.log("Server running on http://0.0.0.0:" + port + "/");
  server.listen(port);

  // stop accepting new connections,
  // wait for established connections to finish (30s max),
  // then exit
  process.on("SIGTERM", function() {
    logging.warn("Got SIGTERM, no longer accepting connections!");

    setTimeout(function() {
      logging.error("Dropping connections after 30s. Force quit.");
      process.exit(1);
    }, 30000);

    server.close(function() {
      logging.log("All connections closed, shutting down.");
      process.exit();
    });
  });
};

exp.close = server.close;

module.exports = exp;

if (require.main === module) {
  logging.error("Please use 'npm start' or 'www.js'");
  process.exit(1);
}
