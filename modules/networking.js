var logging = require("./logging");
var request = require("request");
var config = require("./config");
var skins = require("./skins");
var fs = require("fs");

var session_url = "https://sessionserver.mojang.com/session/minecraft/profile/";
var skins_url = "https://skins.minecraft.net/MinecraftSkins/";
var capes_url = "https://skins.minecraft.net/MinecraftCloaks/";

// exracts the skin url of a +profile+ object
// returns null when no url found (user has no skin)
function extract_skin_url(profile) {
  var url = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name == "textures") {
        var json = Buffer(prop.value, "base64").toString();
        var props = JSON.parse(json);
        url = props && props.textures && props.textures.SKIN && props.textures.SKIN.url || null;
      }
    });
  }
  return url;
}

function extract_cape_url(profile) {
  var url = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name == "textures") {
        var json = Buffer(prop.value, "base64").toString();
        var props = JSON.parse(json);
        url = props && props.textures && props.textures.CAPE && props.textures.CAPE.url || null;
      }
    });
  }
  return url;
}

// make a request to skins.miencraft.net
// the skin url is taken from the HTTP redirect
var get_username_url = function(name, callback) {
  request.get({
    url: skins_url + name + ".png",
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    timeout: config.http_timeout,
    followRedirect: false
  }, function(error, response, body) {
    if (!error && response.statusCode == 301) {
      // skin_url received successfully
      logging.log(name + " skin url received");
      callback(null, response.headers.location);
    } else if (error) {
      callback(error, null);
    } else if (response.statusCode == 404) {
      // skin (or user) doesn't exist
      logging.log(name + " has no skin");
      callback(null, null);
    } else if (response.statusCode == 429) {
      // Too Many Requests
      // Never got this, seems like skins aren't limited
      logging.warn(body || "Too many requests");
      callback(null, null);
    } else {
      logging.error(name + " Unknown error:");
      logging.error(response);
      callback(body || "Unknown error", null);
    }
  });
};

// make a request to sessionserver
// the skin_url is taken from the profile
var get_uuid_url = function(uuid, callback) {
  request.get({
    url: session_url + uuid,
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    timeout: config.http_timeout // ms
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // profile downloaded successfully
      logging.log(uuid + " profile downloaded");
      callback(null, extract_skin_url(JSON.parse(body)));
    } else if (error) {
      callback(error, null);
    } else if (response.statusCode == 204 || response.statusCode == 404) {
      // we get 204 No Content when UUID doesn't exist (including 404 in case they change that)
      logging.log(uuid + " uuid does not exist");
      callback(null, null);
    } else if (response.statusCode == 429) {
      // Too Many Requests
      callback(body || "Too many requests", null);
    } else {
      logging.error(uuid + " Unknown error:");
      logging.error(response);
      callback(body || "Unknown error", null);
    }
  });
};

var exp = {};

// download skin_url for +uuid+ (name or uuid)
// callback contains error, skin_url
exp.get_skin_url = function(uuid, callback) {
  if (uuid.length <= 16) {
    get_username_url(uuid, function(err, url) {
      callback(err, url);
    });
  } else {
    get_uuid_url(uuid, function(err, url) {
      callback(err, url);
    });
  }
};

exp.get_cape_url = function(uuid, callback) {
  if (uuid.length <= 16) {
    get_username_url(uuid, function(err, url) {
      callback(err, url);
    });
  } else {
    get_uuid_url(uuid, function(err, url) {
      callback(err, url);
    });
  }
};

// downloads skin file from +url+
// callback contains error, image
exp.get_skin = function(url, callback) {
  request.get({
    url: url,
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    encoding: null, // encoding must be null so we get a buffer
    timeout: config.http_timeout // ms
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // skin downloaded successfully
      logging.log("downloaded skin");
      logging.debug(url);
      callback(null, body);
    } else {
      if (error) {
        logging.error("Error downloading '" + url + "': " + error);
      } else if (response.statusCode == 404) {
        logging.warn("texture not found (404): " + url);
      } else if (response.statusCode == 429) {
        // Too Many Requests
        // Never got this, seems like textures aren't limited
        logging.warn("too many requests for " + url);
        logging.warn(body);
      } else {
        logging.error("unknown error for " + url);
        logging.error(response);
        logging.error(body);
        error = "unknown error"; // Error needs to be set, otherwise null in callback
      }
      callback(error, null);
    }
  });
};

exp.get_cape = function(url, callback) {
  request.get({
    url: url,
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    encoding: null, // encoding must be null so we get a buffer
    timeout: config.http_timeout // ms
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // cape downloaded successfully
      logging.log("downloaded cape");
      logging.debug(url);
      callback(null, body);
    } else {
      if (error) {
        logging.error("Error downloading '" + url + "': " + error);
      } else if (response.statusCode == 404) {
        logging.warn("texture not found (404): " + url);
      } else if (response.statusCode == 429) {
        logging.warn("too many requests for " + url);
        logging.warn(body);
      } else {
        logging.error("unknown error for " + url);
        logging.error(response);
        logging.error(body);
        error = "unknown error"; // Error needs to be set, otherwise null in callback
      }
      callback(error, null);
    }
  });
};

module.exports = exp;
