var http = require('http');
var https = require('https');
var fs = require('fs');
var lwip = require('lwip');


/*
* Skin retrieval methods are based on @jomo's CLI Crafatar implementation.
* https://github.com/jomo/Crafatar
*/
module.exports = {
  get_profile: function(uuid, callback) {
    https.get("https://sessionserver.mojang.com/session/minecraft/profile/" + uuid, function(res) {
      if (res.statusCode == "204") {
        callback(null);
        return null;
      }
      res.on('data', function(d) {
        var profile = JSON.parse(d);
        if (profile.error) callback(null);
        callback(profile);
      });
      
    }).on('error', function(e) {
      console.error(e);
    });
  },

  skin_url: function(profile) {
    var url = null;
    if (profile && profile.properties) {
      profile.properties.forEach(function(prop) {
        if (prop.name == 'textures') {
          var json = Buffer(prop.value, 'base64').toString();
          var props = JSON.parse(json);
          url = props.textures.SKIN.url;
        }
      });
    }
    return url;
  },

  skin_file: function(url, filename, callback) {
    var file = fs.createWriteStream(filename);
    http.get(url, function(res) {
      res.on('data', function(data) {
        file.write(data);
      }).on('end', function() {
        file.end();
        callback();
      });
    });
  },
  extract_face: function(infile, size, callback) {
    lwip.open(infile, function(err, image){
      image.batch()
      .crop(8,8,15,15)
      .resize(size, size, "nearest-neighbor")
      .toBuffer('png', function(err, buffer){
        callback(buffer);
      });
    });
  }
};