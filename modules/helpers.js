var networking = require('./networking');
var config = require('./config');
var skins = require('./skins');
var fs = require('fs');

var valid_uuid = /^[0-9a-f]{32}$/;

var exp = {};

// exracts the skin url of a +profile+ object
// returns null when no url found
exp.skin_url = function(profile) {
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
};


// returns true if the +uuid+ is a valid uuid
// the uuid may be not exist, however
exp.uuid_valid = function(uuid) {
  return valid_uuid.test(uuid);
};

// handles requests for +uuid+ images with +size+
//
// callback is a function with 3 parameters:
//   error, status, image buffer
//
// the status gives information about how the image was received
//  -1: profile requested, but it was not found
//   1: found on disk
//   2: profile requested/found, skin downloaded from mojang servers
//   3: profile requested/found, but it has no skin
exp.get_avatar = function(uuid, size, callback) {
  var filepath = config.skins_dir + uuid + ".png";
  if (fs.existsSync(filepath)) {
    skins.resize_img(filepath, size, function(result) {
      callback(null, 1, result);
    });
  } else {
    networking.get_profile(uuid, function(err, profile) {
      if (err) {
        callback(err, -1, profile);
      }
      var skinurl = exp.skin_url(profile);

      if (skinurl) {
        networking.skin_file(skinurl, filepath, function() {
          console.log('got skin');
          skins.resize_img(filepath, size, function(result) {
            callback(null, 2, result);
          });
        });
      } else {
        // profile found, but has no skin
        callback(null, 3, null);
      }
    });
  }
};

module.exports = exp;