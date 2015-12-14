var http_code = require("http").STATUS_CODES;
var logging = require("./logging");
var request = require("request");
var config = require("../config");
var skins = require("./skins");
require("./object-patch");

var session_url = "https://sessionserver.mojang.com/session/minecraft/profile/";
var skins_url = "https://skins.minecraft.net/MinecraftSkins/";
var capes_url = "https://skins.minecraft.net/MinecraftCloaks/";
var textures_url = "http://textures.minecraft.net/texture/";
var mojang_urls = [skins_url, capes_url];

var exp = {};

// extracts the +type+ [SKIN|CAPE] URL
// from the nested & encoded +profile+ object
// returns the URL or null if not present
function extract_url(profile, type) {
  var url = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name === "textures") {
        var json = new Buffer(prop.value, "base64").toString();
        var props = JSON.parse(json);
        url = Object.get(props, "textures." + type + ".url") || null;
      }
    });
  }
  return url;
}

// extracts the +type+ [SKIN|CAPE] URL
// from the nested & encoded +profile+ object
// returns the if the model is "slim"
function extract_model(profile) {
  var slim = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name === "textures") {
        var json = new Buffer(prop.value, "base64").toString();
        var props = JSON.parse(json);
        slim = Object.get(props, "textures.SKIN.metadata.model");
      }
    });
  }
  return slim === "slim";
}

// helper method that calls `get_username_url` or `get_uuid_info` based on the +usedId+
// +userId+ is used for usernames, while +profile+ is used for UUIDs
// callback: error, url, slim
function get_info(rid, userId, profile, type, callback) {
  if (userId.length <= 16) {
    // username
    exp.get_username_url(rid, userId, type, function(err, url) {
      callback(err, url || null, false);
    });
  } else {
    exp.get_uuid_info(profile, type, function(url, slim) {
      callback(null, url || null, slim);
    });
  }
}

// performs a GET request to the +url+
// +options+ object includes these options:
//   encoding (string), default is to return a buffer
// callback: the body, response,
// and error buffer. get_from helper method is available
exp.get_from_options = function(rid, url, options, callback) {
  request.get({
    url: url,
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    timeout: config.server.http_timeout,
    followRedirect: false,
    encoding: options.encoding || null,
  }, function(error, response, body) {
    // log url + code + description
    var code = response && response.statusCode;

    var logfunc = code && code < 405 ? logging.debug : logging.warn;
    logfunc(rid, url, code || error && error.code, http_code[code]);

    // not necessarily used
    var e = new Error(code);
    e.name = "HTTP";
    e.code = "HTTPERROR";

    switch (code) {
      case 200:
      case 301:
      case 302: // never seen, but mojang might use it in future
      case 307: // never seen, but mojang might use it in future
      case 308: // never seen, but mojang might use it in future
        // these are okay
        break;
      case 204: // no content, used like 404 by mojang. making sure it really has no content
      case 404:
        // can be cached as null
        body = null;
        break;
      case 429: // this shouldn't usually happen, but occasionally does
      case 500:
      case 503:
      case 504:
        // we don't want to cache this
        error = error || e;
        body = null;
        break;
      default:
        if (!error) {
          // Probably 500 or the likes
          logging.error(rid, "Unexpected response:", code, body);
        }
        error = error || e;
        body = null;
        break;
    }

    if (body && !body.length) {
      // empty response
      body = null;
    }

    callback(body, response, error);
  });
};

// helper method for get_from_options, no options required
exp.get_from = function(rid, url, callback) {
  exp.get_from_options(rid, url, {}, function(body, response, err) {
    callback(body, response, err);
  });
};

// make a request to skins.miencraft.net
// the skin url is taken from the HTTP redirect
// type reference is above
exp.get_username_url = function(rid, name, type, callback) {
  type = Number(type === "CAPE");
  exp.get_from(rid, mojang_urls[type] + name + ".png", function(body, response, err) {
    if (!err) {
      if (response) {
        callback(err, response.statusCode === 404 ? null : response.headers.location);
      } else {
        callback(err, null);
      }
    } else {
      callback(err, null);
    }
  });
};

// gets the URL for a skin/cape from the profile
// +type+ "SKIN" or "CAPE", specifies which to retrieve
// callback: url, slim
exp.get_uuid_info = function(profile, type, callback) {
  var properties = Object.get(profile, "properties") || [];
  properties.forEach(function(prop) {
    if (prop.name === "textures") {
      var json = new Buffer(prop.value, "base64").toString();
      profile = JSON.parse(json);
    }
  });

  var url = Object.get(profile, "textures." + type + ".url");
  var slim;
  if (type === "SKIN") {
    slim = Object.get(profile, "textures.SKIN.metadata.model");
  }

  callback(url || null, !!slim);
};

// make a request to sessionserver for +uuid+
// callback: error, profile
exp.get_profile = function(rid, uuid, callback) {
  if (!uuid) {
    callback(null, null);
  } else {
    exp.get_from_options(rid, session_url + uuid, { encoding: "utf8" }, function(body, response, err) {
      try {
        body = body ? JSON.parse(body) : null;
        callback(err || null, body);
      } catch(e) {
        if (e instanceof SyntaxError) {
          logging.warn(rid, "Failed to parse JSON", e);
          logging.debug(rid, body);
          callback(err || null, null);
        } else {
          throw e;
        }
      }
    });
  }
};

// get the skin URL and type for +userId+
// +profile+ is used if +userId+ is a uuid
// callback: error, url, slim
exp.get_skin_info = function(rid, userId, profile, callback) {
  get_info(rid, userId, profile, "SKIN", callback);
};

// get the cape URL for +userId+
// +profile+ is used if +userId+ is a uuid
exp.get_cape_url = function(rid, userId, profile, callback) {
  get_info(rid, userId, profile, "CAPE", callback);
};

// download the +tex_hash+ image from the texture server
// and save it in the +outpath+ file
// callback: error, response, image buffer
exp.save_texture = function(rid, tex_hash, outpath, callback) {
  if (tex_hash) {
    var textureurl = textures_url + tex_hash;
    exp.get_from(rid, textureurl, function(img, response, err) {
      if (err) {
        callback(err, response, null);
      } else {
        skins.save_image(img, outpath, function(img_err, saved_img) {
          callback(img_err, response, saved_img);
        });
      }
    });
  } else {
    callback(null, null, null);
  }
};

module.exports = exp;