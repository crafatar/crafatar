'use strict';

var helpers = require("../helpers");
var skins = require("../skins");
var cache = require("../cache");
var path = require("path");
var lwip = require("lwip");
var url = require("url");
var promisify = require('promisify-node');
let Boom = require('boom');
let Bluebird = require('bluebird');
Bluebird.promisifyAll(lwip)
Bluebird.promisifyAll(require('lwip/lib/Image').prototype)
Bluebird.promisifyAll(require('lwip/lib/Batch').prototype)

exports.init = function(router) {
  router.get('/skins/:userId', getSkin);
};

// handle the appropriate 'default=' response
// uses either mhf_steve or mhf_alex (based on +userId+) if no +def+ given
let handle_default = (userId, def) => {
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
    lwip.openAsync(path.join(__dirname, "..", "public", "images", def + "_skin.png"))
      .then(function(image) {
        return image.toBufferAsync('png');
    }).then((buffer) => {
        this.body = buffer;
        this.type = 'image/png';
        this.hash = def;
      }).catch(function(err) {
        throw Boom.badImplementation('Unable to access default skin');
      });
  }
};

// GET skin request
function* getSkin(next) {
  var userId = helpers.validateUserId(this.params.userId);
  var def = this.query.default;

  try {
    let data = yield promisify(helpers.get_skin)(this.id, userId)
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
      this.crafatarStatus = 2;
      handle_default(userId, def, null);
    }
  } catch (e) {
    this.crafatarStatus = -1;
    handle_default(userId, def, e);
  }
};
