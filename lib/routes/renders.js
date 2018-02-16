var logging = require("../logging");
var helpers = require("../helpers");
var renders = require("../renders");
var config = require("../../config");
var cache = require("../cache");
var skins = require("../skins");
var path = require("path");
var url = require("url");
var fs = require("fs");

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
function handle_default(rid, scale, overlay, body, img_status, userId, size, def, req, err, callback) {
  def = def || skins.default_skin(userId);
  var defname = def.toLowerCase();
  if (defname !== "steve" && defname !== "mhf_steve" && defname !== "alex" && defname !== "mhf_alex") {
    if (helpers.id_valid(def)) {
      // clean up the old URL to match new image
      var parsed = req.url;
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
module.exports = function(req, callback) {
  var raw_type = req.url.path_list[1] || "";
  var rid = req.id;
  var body = raw_type === "body";
  var userId = (req.url.path_list[2] || "").split(".")[0];
  var def = req.url.query.default;
  var scale = parseInt(req.url.query.scale) || config.renders.default_scale;
  var overlay = Object.prototype.hasOwnProperty.call(req.url.query, "overlay") || Object.prototype.hasOwnProperty.call(req.url.query, "helm");

  // check for extra paths
  if (req.url.path_list.length > 3) {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404
    });
    return;
  }

  // validate type
  if (raw_type !== "body" && raw_type !== "head") {
    callback({
      status: -2,
      body: "Invalid Render Type"
    });
    return;
  }

  if (scale < config.renders.min_scale || scale > config.renders.max_scale) {
    callback({
      status: -2,
      body: "Invalid Scale"
    });
    return;
  } else if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UUID"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    helpers.get_render(rid, userId, scale, overlay, body, function(err, status, hash, image) {
      if (err) {
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(rid, userId);
        }
      }
      if (image) {
        callback({
          status: status,
          body: image,
          type: "image/png",
          hash: hash,
          err: err
        });
      } else {
        logging.debug(rid, "image not found, using default.");
        handle_default(rid, scale, overlay, body, status, userId, scale, def, req, err, callback);
      }
    });
  } catch(e) {
    handle_default(rid, scale, overlay, body, -1, userId, scale, def, req, e, callback);
  }
};