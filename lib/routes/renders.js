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
let Bluebird = require('bluebird');
Bluebird.promisifyAll(fs);
let Boom = require('boom');

var promisify = require('promisify-node');

exports.init = function(router) {
    router.get('/renders/:type/:userId', getRender);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
// callback: response object
let handle_default = (scale, overlay, body, userId, size, def) => {
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
    fs.readFileAsync(path.join(__dirname, "..", "public", "images", def + "_skin.png"))
        .then(function(buf) {
            // we render the default skins, but not custom images
            renders.draw_model(this.id, buf, scale, overlay, body, def === "mhf_alex", (render_err, def_img) => {
                this.body = def_img;
                this.type = 'image/png';
                this.hash = def;
            });
            
        });
  }
}

// GET render request
function* getRender(next) {
  var renderType = this.params.type || "";
  var body = renderType === "body";
  var userId = this.params.userId || "";
  var def = this.query.default;
  var scale = parseInt(this.query.scale) || config.renders.default_scale;
  var overlay = this.query.overlay !== undefined || this.query.helm !== undefined

  // validate type
  const allowedTypes = ['body', 'head'];
  if (!allowedTypes.includes(renderType)) {
      throw new Boom.badRequest(`Invalid Render Type. ${allowedTypes} are allowed.`)
  }

  if (scale < config.renders.min_scale || scale > config.renders.max_scale) {
      throw Boom.badData(`scale must be between ${config.renders.min_scale} and ${config.renders.max_scale}`);
  } else if (!helpers.id_valid(userId)) {
      throw Boom.badRequest('Invalid UserID');
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    let data = yield promisify(helpers.get_render)(this.id, userId, scale, overlay, body)
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
        logging.debug(this.id, "image not found, using default.");
        handle_default(scale, overlay, body, userId, scale, def);
      }
  } catch(e) {
      this.crafatarStatus = -1;
    handle_default(scale, overlay, body, userId, scale, def);
  }
};
