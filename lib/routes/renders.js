'use strict';

var logging = require("../logging");
var helpers = require("../helpers");
var renders = require("../renders");
var config = require("../../config");
var cache = require("../cache");
var skins = require("../skins");
var path = require("path");
var url = require("url");
var fs = require("fs");

var promisify = require('promisify-node');

exports.init = function(router) {
    router.get('/renders/:type/:userId', getRender);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (rid, scale, overlay, body, img_status, userId, size, def, err, callback) => {
  def = def || skins.default_skin(userId);
  var defname = def.toLowerCase();
  if (defname !== "steve" && defname !== "mhf_steve" && defname !== "alex" && defname !== "mhf_alex") {
    if (helpers.id_valid(def)) {
      // clean up the old URL to match new image
      var parsed = this.url;
      delete parsed.query.default;
      delete parsed.search;
      parsed.path_list[2] = def;
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
    fs.readFile(path.join(__dirname, "..", "public", "images", def + "_skin.png"), function(fs_err, buf) {
      // we render the default skins, but not custom images
      renders.draw_model(rid, buf, scale, overlay, body, def === "mhf_alex", function(render_err, def_img) {
        callback({
          status: img_status,
          body: def_img,
          type: "image/png",
          hash: def,
          err: render_err || fs_err || err
        });
      });
    });
  }
}

// GET render request
function* getRender(next) {
  var raw_type = this.params.type || "";
  var rid = this.id;
  var body = raw_type === "body";
  var userId = this.params.userId || "";
  var def = this.query.default;
  var scale = parseInt(this.query.scale) || config.renders.default_scale;
  var overlay = this.query.hasOwnProperty("overlay") || this.query.hasOwnProperty("helm");

  // No need to check for extra paths, since the router will reject it automatically

  let callback = result => {
    this.result = result;
  }

  // validate type
  if (raw_type !== "body" && raw_type !== "head") {
    callback({
      status: -2,
      body: "Invalid Render Type"
    });
    yield next;
  }

  if (scale < config.renders.min_scale || scale > config.renders.max_scale) {
    callback({
      status: -2,
      body: "Invalid Scale"
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
    let data = yield promisify(helpers.get_render)(rid, userId, scale, overlay, body)
        .catch(err => {
            if (err.code === "ENOENT") {
                // no such file
                cache.remove_hash(rid, userId);
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
        logging.debug(rid, "image not found, using default.");
        handle_default(rid, scale, overlay, body, status, userId, scale, def, null, callback);
      }
  } catch(e) {
    handle_default(rid, scale, overlay, body, -1, userId, scale, def, e, callback);
  }
};
