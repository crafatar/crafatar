'use strict';

var helpers = require("../helpers");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var lwip = require("lwip");
var url = require("url");
var promisify = require('promisify-node');

exports.init = function(router) {
    router.get('/skins/:userId', getSkin);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (img_status, userId, def, err, callback) => {
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
    lwip.open(path.join(__dirname, "..", "public", "images", def + "_skin.png"), function(lwip_err, image) {
      if (image) {
        image.toBuffer("png", function(buf_err, buffer) {
          callback({
            status: img_status,
            body: buffer,
            type: "image/png",
            hash: def,
            err: buf_err || lwip_err || err
          });
        });
      } else {
        callback({
          status: -1,
          err: lwip_err || err
        });
      }
    });
  }
}

// GET skin request
function* getSkin(next) {
  let callback = result => {
    this.result = result;
  }

  var userId = this.params.userId || "";
  var def = this.query.default;
  var rid = this.id;

  // No need to check for extra paths, since the router will reject it automatically

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
    let data = yield promisify(helpers.get_skin)(rid, userId)
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
        hash: data.hash,
        err: null
      });
    } else {
      handle_default(2, userId, def, null, callback);
    }
  } catch(e) {
    handle_default(-1, userId, def, e, callback);
  } finally {
      yield next;
  }
};
