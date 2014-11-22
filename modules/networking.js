var request = require('request');
var config = require('./config');
var skins = require('./skins');
var fs = require("fs");

var session_url = "https://sessionserver.mojang.com/session/minecraft/profile/";

var exp = {};

// download the Mojang profile for +uuid+
// callback contains error, profile object
exp.get_profile = function(uuid, callback) {
  if (uuid.length <= 16) {
    callback(null, null);
    return;
  }
  request.get({
    url: session_url + uuid,
    timeout: config.http_timeout // ms
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // profile downloaded successfully
      console.log(uuid + " profile downloaded");
      callback(null, JSON.parse(body));
    } else if (error) {
      callback(error, null);
    } else if (response.statusCode == 204 || response.statusCode == 404) {
      // we get 204 No Content when UUID doesn't exist (including 404 in case they change that)
      console.log(uuid + " uuid does not exist");
      callback(0, null);
    } else if (response.statusCode == 429) {
      // Too Many Requests
      console.warn(uuid + " Too many requests");
      console.warn(body);
      callback(null, null);
    } else {
      console.error(uuid + " Unknown error:");
      console.error(response);
      console.error(body);
      callback(null, null);
    }
  });
};

// downloads skin file from +url+
// stores face image as +facename+
// stores helm image as +helmname+
// callback is forwarded from skins/extract_face or skins/extract_helm
exp.skin_file = function(url, facename, helmname, callback) {
  if (fs.existsSync(facename) && fs.existsSync(facename)) {
    console.log("Images already exist, not downloading.");
    callback(null);
    return;
  }
  request.get({
    url: url,
    encoding: null, // encoding must be null so we get a buffer
    timeout: config.http_timeout // ms
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // skin downloaded successfully
      console.log(url + " skin downloaded");
      skins.extract_face(body, facename, function(err) {
        if (err) {
          callback(err);
        } else {
          console.log(facename + " face extracted");
          skins.extract_helm(facename, body, helmname, function(err) {
            console.log(helmname + " helm extracted.");
            callback(err);
          });
        }
      });
    } else {
      if (error) {
        console.error("Error downloading '" + url + "': " + error);
      } else if (response.statusCode == 404) {
        console.warn("texture not found (404): " + url);
      } else if (response.statusCode == 429) {
        // Too Many Requests
        // Never got this, seems like textures aren't limited
        console.warn("too many requests for " + url);
        console.warn(body);
      } else {
        console.error("unknown error for " + url);
        console.error(response);
        console.error(body);
        error = "unknown error"; // Error needs to be set, otherwise null in callback
      }
      callback(error);
    }
  });
};

module.exports = exp;