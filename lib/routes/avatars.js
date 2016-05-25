'use strict';

var helpers = require("../helpers");
var config = require("../../config");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var url = require("url");
var promisify = require('promisify-node');

exports.init = function(router) {
    router.get('/avatars/:userId', getAvatar);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (img_status, userId, size, def, err, callback) => {
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
      callback({
        status: img_status,
        redirect: newUrl,
        err: err
      });
    } else {
      callback({
        status: img_status,
        redirect: def,
        err: err
      });
    }
  } else {
    // handle steve and alex
    def = defname;
    if (def.substr(0, 4) !== "mhf_") {
      def = "mhf_" + def;
    }
    skins.resize_img(path.join(__dirname, "..", "public", "images", def + ".png"), size, function(resize_err, image) {
      callback({
        status: img_status,
        body: image,
        type: "image/png",
        hash: def,
        err: resize_err || err
      });
    });
  }
}

// GET avatar request
function* getAvatar(next) {
  let callback = result => {
      this.result = result;
  }

  var userId = this.params.userId || "";
  var size = this.query.size || config.avatars.default_size;
  var def = this.query.default;
  var overlay = this.query.hasOwnProperty("overlay") || this.query.hasOwnProperty("helm");

  // No need to check for extra paths, since the router will reject it automatically

  // Prevent app from crashing/freezing
  if (size < config.avatars.min_size || size > config.avatars.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    callback({
      status: -2,
      body: "Invalid Size"
    });
    yield next;
  } else if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UserID"
    });
    yield next;
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
        callback({
          status: data.status,
          body: data.image,
          type: "image/png",
          err: null,
          hash: data.hash
        });
      } else {
        handle_default(data.status, userId, size, def, null, callback);
      }
  } catch (e) {
    handle_default(-1, userId, size, def, e, callback);
  } finally {
      yield next;
  }
};
