'use strict';

var helpers = require("../helpers");
var config = require("../../config");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var url = require("url");
let Boom = require('boom');

exports.init = function(router) {
  router.get('/avatars/:userId', getAvatar);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (userId, size, def) => {
  def = def || skins.default_skin(userId);
  var defname = def.toLowerCase();
  if (defname !== "steve" && defname !== "mhf_steve" && defname !== "alex" && defname !== "mhf_alex") {
    if (helpers.id_valid(def)) {
      // clean up the old URL to match new image
      var parsed = this.url;
      delete parsed.query.default;
      delete parsed.search;
      parsed.path_list[1] = def;
      parsed.pathname = "/" + parsed.path_list.join("/");
      var newUrl = url.format(parsed);
      this.redirectTo = newUrl;
    } else {
      this.redirectTo = def;
    }
  } else {
    // handle steve and alex
    def = defname;
    if (def.substr(0, 4) !== "mhf_") {
      def = "mhf_" + def;
    }
    skins.resize_img(path.join(__dirname, "..", "public", "images", def + ".png"), size)
      .catch(function(err) {
        throw new Boom.wrap(err);
      })
      .then(image => {
        this.body = image;
        this.type = 'image/png';
        this.hash = def;
      });
  }
}

// GET avatar request
function* getAvatar(next) {
  var userId = helpers.validateUserId(this.params.userId);
  var def = this.query.default;
  var overlay = this.query.overlay !== undefined || this.query.helm !== undefined;

  // Check if the user put some nonsense in for size
  if (this.query.size !== undefined && isNaN(this.query.size)) {
    throw Boom.badRequest('size must be a valid number.');
  }
  // If the user passes in an empty string for size, Number(size) will result in 0 and thus the default size will be used
  let size = Number(this.query.size) || config.avatars.default_size;

  // Prevent app from crashing/freezing
  if (size < config.avatars.min_size || size > config.avatars.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    throw Boom.badData(`size must be between ${config.avatars.min_size} and ${config.avatars.max_size}`);
  }

  let data = yield helpers.get_avatar(this.id, userId, overlay, size)
    .catch(err => {
      if (err.code === "ENOENT") {
        // no such file
        cache.remove_hash(this.id, userId);
      }
    });
  if (data.image) {
    this.crafatarStatus = data.status;
    this.body = data.image;
    this.type = 'image/png';
    this.hash = data.hash;
  } else {
    handle_default(userId, size, def);
  }
};
