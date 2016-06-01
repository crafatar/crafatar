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

  if (!helpers.id_valid(userId)) {
      throw Boom.badRequest('Invalid UserID');
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    let data = yield promisify(helpers.get_cape)(this.id, userId)
        .catch(err => {
            if (err.code === "ENOENT") {
                // no such file
                cache.remove_hash(this.id, userId);
            }
        });
    this.crafatarStatus = data.status;
    this.body = data.image;
    this.type = data.image ? 'image/png' : undefined;
    this.redirectTo = data.image ? undefined : def;
    this.hash = data.hash;
  } catch(e) {
      this.crafatarStatus = -1;
  }
};
