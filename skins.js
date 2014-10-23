var request = require('request');
var lwip = require('lwip');

/*
* Skin retrieval methods are based on @jomo's CLI Crafatar implementation.
* https://github.com/jomo/Crafatar
*/

function extract_face(buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      console.log('c ' + buffer.length);
      throw err;
    }
    image.batch()
    .crop(8, 8, 15, 15)
    .writeFile(outname, function(err) {
      if (err) throw err;
      callback();
    });
  });
}

module.exports = {
  get_profile: function(uuid, callback) {
    request.get({
      url: "https://sessionserver.mojang.com/session/minecraft/profile/" + uuid,
      timeout: 1000 // ms
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        callback(JSON.parse(body));
      } else {
        if (error) {
          console.error(error);
        } else if (response.statusCode == 204 || response.statusCode == 404) {
          // we get 204 No Content when UUID doesn't exist (including 404 in case they change that)
        } else if (response.statusCode == 429) {
          // Too Many Requests
          console.warn("Too many requests for " + uuid);
          console.warn(body);
        } else {
          console.error("Unknown error:");
          console.error(response);
          console.error(body);
        }
        callback(null);
      }
    });
  },

  skin_url: function(profile) {
    var url = null;
    if (profile && profile.properties) {
      profile.properties.forEach(function(prop) {
        if (prop.name == 'textures') {
          var json = Buffer(prop.value, 'base64').toString();
          var props = JSON.parse(json);
          url = props && props.textures && props.textures.SKIN && props.textures.SKIN.url;
        }
      });
    }
    return url;
  },

  skin_file: function(url, outname, callback) {
    request.get({
      url: url,
      encoding: null, // encoding must be null so we get a buffer
      timeout: 1000 // ms
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        extract_face(body, outname, function() {
          callback();
        });
      } else {
        if (error) {
          console.error(error);
        } else if (response.statusCode == 404) {
          console.warn("Texture not found: " + url);
        } else if (response.statusCode == 429) {
          // Too Many Requests
          // Never got this, seems like textures aren't limited
          console.warn("Too many requests for " + url);
          console.warn(body);
        } else {
          console.error("Unknown error:");
          console.error(response);
          console.error(body);
        }
        callback(null);
      }
    });
  },

  resize_img: function(inname, size, callback) {
    lwip.open(inname, function(err, image) {
      if (err) throw err;
      image.batch()
      .resize(size, size, "nearest-neighbor") // nearest-neighbor doesn't blur
      .toBuffer('png', function(err, buffer) {
        callback(buffer);
      });
    });
  }
};