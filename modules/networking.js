var logging = require("./logging");
var request = require("requestretry");
var config = require("./config");
var fs = require("fs");

var session_url = "https://sessionserver.mojang.com/session/minecraft/profile/";
var skins_url = "https://skins.minecraft.net/MinecraftSkins/";
var capes_url = "https://skins.minecraft.net/MinecraftCloaks/";

var exp = {};

function extract_url(profile, property) {
  var url = null;
  if (profile && profile.properties) {
    profile.properties.forEach(function(prop) {
      if (prop.name === "textures") {
        var json = new Buffer(prop.value, "base64").toString();
        var props = JSON.parse(json);
        url = props && props.textures && props.textures[property] && props.textures[property].url || null;
      }
    });
  }
  return url;
};

// exracts the skin url of a +profile+ object
// returns null when no url found (user has no skin)
exp.extract_skin_url = function(profile) {
  return extract_url(profile, 'SKIN');
};

// exracts the cape url of a +profile+ object
// returns null when no url found (user has no cape)
exp.extract_cape_url = function(profile) {
  return extract_url(profile, 'CAPE');
};

// makes a GET request to the +url+
// +options+ hash includes various options for
// encoding and timeouts, defaults are already
// specified. +callback+ contains the body, response,
// and error buffer. get_from helper method is available
exp.get_from_options = function(url, options, callback) {
  request({
    url: url,
    headers: {
      "User-Agent": "https://crafatar.com"
    },
    timeout: (options.timeout || config.http_timeout),
    encoding: (options.encoding || null),
    followRedirect: (options.folow_redirect || false),
    maxAttempts: 2,
    retryDelay: 2000,
    retryStrategy: request.RetryStrategies.NetworkError
  }, function(error, response, body) {
    if (!error && (response.statusCode === 200 || response.statusCode === 301)) {
      // skin_url received successfully
      logging.log(url + " url received");
      callback(body, response, null);
    } else if (error) {
      callback(body || null, response, error);
    } else if (response.statusCode === 404) {
      // page doesn't exist
      logging.log(url + " url does not exist");
      callback(null, response, null);
    } else if (response.statusCode === 429) {
      // Too Many Requests exception - code 429
      logging.warn(body || "Too many requests");
      callback(body || null, response, error);
    } else {
      logging.error(url + " Unknown error:");
      //logging.error(response);
      callback(body || null, response, error);
    }
  });
};

// helper method for get_from_options, no options required
exp.get_from = function(url, callback) {
  exp.get_from_options(url, {}, function(body, response, err) {
    callback(body, response, err);
  });
};

// specifies which numbers identify what url
var mojang_url_types = {
  1: skins_url,
  2: capes_url
};

// make a request to skins.miencraft.net
// the skin url is taken from the HTTP redirect
// type reference is above
exp.get_username_url = function(name, type, callback) {
  exp.get_from(mojang_url_types[type] + name + ".png", function(body, response, err) {
    if (!err) {
      callback(err, response ? (response.statusCode === 404 ? null : response.headers.location) : null);
    } else {
      callback(err, null);
    }
  });
};

// gets the URL for a skin/cape from the profile
// +type+ specifies which to retrieve
exp.get_uuid_url = function(profile, type, callback) {
  var url = null;
  if (type === 1) {
    url = exp.extract_skin_url(profile);
  } else if (type === 2) {
    url = exp.extract_cape_url(profile);
  }
  callback(url || null);
};

// make a request to sessionserver
// profile is returned as json
exp.get_profile = function(uuid, callback) {
  if (!uuid) {
    callback(null, null);
  } else {
    exp.get_from_options(session_url + uuid, {encoding: "utf8"} ,function(body, response, err) {
      callback(err !== null ? err : null, (body !== null ? JSON.parse(body) : null));
    }); 
  }
};

// todo remove middleman

// +uuid+ is likely a username and if so
// +uuid+ is used to get the url, otherwise
// +profile+ will be used to get the url
exp.get_skin_url = function(uuid, profile, callback) {
  getUrl(uuid, profile, 1, function(url) {
    callback(url);
  });
};

// +uuid+ is likely a username and if so
// +uuid+ is used to get the url, otherwise
// +profile+ will be used to get the url
exp.get_cape_url = function(uuid, profile, callback) {
  getUrl(uuid, profile, 2, function(url) {
    callback(url);
  });
};

function getUrl(uuid, profile, type, callback) {
  if (uuid.length <= 16) {
    //username
    exp.get_username_url(uuid, type, function(err, url) {
      callback(url || null);
    });
  } else {
    exp.get_uuid_url(profile, type, function(url) {
      callback(url || null);
    });
  }
}

// downloads skin file from +url+
// callback contains error, image
exp.get_skin = function(url, callback) {
  exp.get_from(url, function(body, response, err) {
    callback(body, err);
  });
};

exp.save_texture = function(uuid, hash, outpath, callback) {
  if (hash) {
    var textureurl = "http://textures.minecraft.net/texture/" + hash;
    exp.get_from(textureurl, function(img, response, err) {
      if (err) {
        logging.error(uuid + "error while downloading texture");
        callback(err, response, null);
      } else {
        fs.writeFile(outpath, img, "binary", function(err) {
          if (err) {
            logging.log(uuid + " error: " + err);
          }
          callback(err, response, img);
        });
      }
    });
  } else {
    callback(null, null, null);
  }
};

exp.get_cape = function(url, callback) {
  exp.get_from(url, function(body, response, err) {
    callback(err, body);
  });
};

module.exports = exp;
