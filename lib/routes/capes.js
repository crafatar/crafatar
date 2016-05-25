'use strict';

var helpers = require("../helpers");
var cache = require("../cache");
var promisify = require('promisify-node');

exports.init = function(router) {
    router.get('/capes/:userId', getCape);
};

function* getCape(next) {
  var userId = this.params.userId || "";
  var def = this.query.default;
  var rid = this.id;

  // No need to check for extra paths, since the router will reject it automatically

  let callback = result => {
      this.result = result;
  }

  if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UserID"
    });
    yield next;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    let data = yield promisify(helpers.get_cape)(rid, userId)
        .catch(err => {
            if (err.code === "ENOENT") {
                // no such file
                cache.remove_hash(rid, userId);
            }
        });
      callback({
        status: data.status,
        body: data.image,
        type: data.image ? "image/png" : undefined,
        redirect: data.image ? undefined : def,
        hash: data.hash,
        err: null
      });
  } catch(e) {
    callback({
      status: -1,
      err: e
    });
  } finally {
    yield next;
  }
};
