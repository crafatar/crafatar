'use strict';

var helpers = require("../helpers");
var config = require("../../config");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var url = require("url");
var promisify = require('promisify-node');
let Boom = require('boom');

exports.init = function(router) {
    router.get('/avatars/:userId', getAvatar);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (img_status, userId, size, def) => {
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
      this.crafatarStatus = img_status;
      this.redirectTo = newUrl;
    } else {
      this.crafatarStatus = img_status;
      this.redirectTo = def;
    }
  } else {
    // handle steve and alex
    def = defname;
    if (def.substr(0, 4) !== "mhf_") {
      def = "mhf_" + def;
    }
    skins.resize_img(path.join(__dirname, "..", "public", "images", def + ".png"), size)
        .catch(err => {
            throw new Boom.wrap(err);
        })
        .then(image => {
          this.crafatarStatus = img_status;
          this.body = image;
          this.type = 'image/png';
          this.hash = def;
        });
  }
}

// GET avatar request
function* getAvatar(next) {
  var userId = this.params.userId || "";
  var def = this.query.default;
  var overlay = this.query.overlay !== undefined || this.query.helm !== undefined;

  // Check if the user put some nonsense in for size
  if(this.query.size !== undefined && isNaN(this.query.size)) {
      throw Boom.badRequest('size must be a valid number.');
  }
  let size = Number(this.query.size) || config.avatars.default_size;

  // Prevent app from crashing/freezing
  if (size < config.avatars.min_size || size > config.avatars.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    throw Boom.badData('Invalid Size');
  } else if (!helpers.id_valid(userId)) {
    throw Boom.badData('Invalid UserID');
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    let data = yield promisify(helpers.get_avatar)(this.id, userId, overlay, size)
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
        handle_default(data.status, userId, size, def);
      }
  } catch (e) {
    handle_default(-1, userId, size, def, e, callback);
  }
};
