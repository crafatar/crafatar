var http = require('http');
var https = require('https');
var fs = require('fs');
var lwip = require('lwip');


/*
* Skin retrieval methods are based on @jomo's CLI Crafatar implementation.
* https://github.com/jomo/Crafatar
*/

function extract_face(inname, outname, callback) {
  var outfile = fs.createWriteStream(outname);
  lwip.open(inname, function(err, image) {
    if (err) throw err;
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
    https.get("https://sessionserver.mojang.com/session/minecraft/profile/" + uuid, function(res) {
      if (res.statusCode == "204") {
        callback(null);
        return null;
      }
      res.on('data', function(d) {
        var profile = JSON.parse(d);
        if (profile.error) {
          // usually this is something like TooManyRequestsException
          console.error(profile.error);
          callback(null);
        } else {
          callback(profile);
        }
      });

    }).on('error', function(err) {
      throw err;
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

  skin_file: function(url, filename, callback) {
    var tmpname = "skins/tmp/" + filename;
    var outname = "skins/" + filename;
    var tmpfile = fs.createWriteStream(tmpname);
    http.get(url, function(res) {
      res.on('data', function(data) {
        tmpfile.write(data);
      }).on('end', function() {
        tmpfile.end();
        extract_face(tmpname, outname, function() {
          fs.unlink(tmpname, function(err) { // unlink = delete
            if (err) console.error(err);
          });
          callback(); // outside unlink callback cause we don't have to wait until it's deleted
        });
      });
    }).on('error', function(err) {
      throw err;
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