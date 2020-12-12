var logging = require("./logging");
var request = require("request");
var config = require("../config");
var skins = require("./skins");
var http = require("http");
require("./object-patch");

var session_url = "https://sessionserver.mojang.com/session/minecraft/profile/";
var textures_url = "https://textures.minecraft.net/texture/";

// count requests made to session_url in the last 1000ms
var session_requests = [];

var exp = {};

// returns the amount of outgoing session requests made in the last 1000ms
function req_count() {
  var index = session_requests.findIndex((i) => i >= Date.now() - 1000);
  if (index >= 0) {
    return session_requests.length - index;
  } else {
    return 0;
  }
}

// deletes all entries in session_requests, should be called every 1000ms
exp.resetCounter = function() {
  var count = req_count();
  if (count) {
    var logfunc = count >= config.server.sessions_rate_limit ? logging.warn : logging.debug;
    logfunc('Clearing old session requests (count was ' + count + ')');
    session_requests.splice(0, session_requests.length - count);
  } else {
    session_requests = []
  }
}

// performs a GET request to the +url+
// +options+ object includes these options:
//   encoding (string), default is to return a buffer
// callback: the body, response,
// and error buffer. get_from helper method is available
exp.get_from_options = function(rid, url, options, callback) {
  var is_session_req = config.server.sessions_rate_limit && url.startsWith(session_url);

  // This is to prevent being blocked by CloudFront for exceeding the rate limit
  if (is_session_req && req_count() >= config.server.sessions_rate_limit) {
    var e = new Error("Skipped, rate limit exceeded");
    e.name = "HTTP";
    e.code = "RATELIMIT";

    var response = new http.IncomingMessage();
    response.statusCode = 403;

    callback(null, response, e);
  } else {
    is_session_req && session_requests.push(Date.now());
    request.get({
      url: url,
      headers: {
        "User-Agent": "Crafatar (+https://crafatar.com)"
      },
      timeout: config.server.http_timeout,
      followRedirect: false,
      encoding: options.encoding || null,
    }, function(error, response, body) {
      // log url + code + description
      var code = response && response.statusCode;

      var logfunc = code && (code < 400 || code === 404) ? logging.debug : logging.warn;
      logfunc(rid, url, code || error && error.code, http.STATUS_CODES[code]);

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
        case 403: // Blocked by CloudFront :(
        case 429: // this shouldn't usually happen, but occasionally does
        case 500:
        case 502: // CloudFront can't reach mojang origin
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
  }
};

// helper method for get_from_options, no options required
exp.get_from = function(rid, url, callback) {
  exp.get_from_options(rid, url, {}, function(body, response, err) {
    callback(body, response, err);
  });
};

// gets the URL for a skin/cape from the profile
// +type+ "SKIN" or "CAPE", specifies which to retrieve
// callback: url, slim
exp.get_uuid_info = function(profile, type, callback) {
  var properties = Object.get(profile, "properties") || [];
  properties.forEach(function(prop) {
    if (prop.name === "textures") {
      var json = new Buffer.from(prop.value, "base64").toString();
      profile = JSON.parse(json);
    }
  });

  var url = Object.get(profile, "textures." + type + ".url");
  var slim;
  if (type === "SKIN") {
    slim = Object.get(profile, "textures.SKIN.metadata.model") === "slim";
  }

  callback(null, url || null, !!slim);
};

// make a request to sessionserver for +uuid+
// callback: error, profile
exp.get_profile = function(rid, uuid, callback) {
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
};

// get the skin URL and type for +userId+
// +profile+ is used if +userId+ is a uuid
// callback: error, url, slim
exp.get_skin_info = function(rid, userId, profile, callback) {
  exp.get_uuid_info(profile, "SKIN", callback);
};

// get the cape URL for +userId+
// +profile+ is used if +userId+ is a uuid
exp.get_cape_url = function(rid, userId, profile, callback) {
  exp.get_uuid_info(profile, "CAPE", callback);
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
        skins.save_image(img, outpath, function(img_err) {
          callback(img_err, response, img);
        });
      }
    });
  } else {
    callback(null, null, null);
  }
};

module.exports = exp;