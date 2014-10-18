var http = require('http');
var https = require('https');
var fs = require('fs');
var imagemagick = require('imagemagick');

module.exports = {
  get_profile: function(uuid, callback) {
    https.get("https://sessionserver.mojang.com/session/minecraft/profile/" + uuid, function(res) {
     res.on('data', function(d) {
       var profile = JSON.parse(d);
       if (profile.error) throw profile.error;
       callback(profile);
     });
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
  extract_face: function(infile, outfile, callback) {
    imagemagick.convert([infile, '-crop', '8x8+8+8', outfile], function(err, stdout) {
      if (err) throw err;
      callback();
    });
  }
};