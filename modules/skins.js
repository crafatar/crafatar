var logging = require("./logging");
var lwip = require("lwip");
var fs = require("fs");

var exp = {};

// extracts the face from an image +buffer+
// result is saved to a file called +outname+
// +callback+ contains error
exp.extract_face = function(buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.batch()
      .crop(8, 8, 15, 15) // face
      .writeFile(outname, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    }
  });
};

// extracts the helm from an image +buffer+ and lays it over a +facefile+
// +facefile+ is the filename of an image produced by extract_face
// result is saved to a file called +outname+
// +callback+ contains error
exp.extract_helm = function(rid, facefile, buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, skin_img) {
    if (err) {
      callback(err);
    } else {
      lwip.open(facefile, function(err, face_img) {
        if (err) {
          callback(err);
        } else {
          face_img.toBuffer("png", { compression: "none" }, function(err, face_buffer) {
            skin_img.crop(40, 8, 47, 15, function(err, helm_img) {
              if (err) {
                callback(err);
              } else {
                face_img.paste(0, 0, helm_img, function(err, face_helm_img) {
                  if (err) {
                    callback(err);
                  } else {
                    face_helm_img.toBuffer("png", {compression: "none"}, function(err, face_helm_buffer) {
                      if (face_helm_buffer.toString() !== face_buffer.toString()) {
                        face_helm_img.writeFile(outname, function(err) {
                          callback(err);
                        });
                      } else {
                        logging.log(rid + "helm img == face img, not storing!");
                        callback(null);
                      }
                    });
                  }
                });
              }
            });
          });
        }
      });
    }
  });
};

// resizes the image file +inname+ to +size+ by +size+ pixels
// +callback+ contains error, image buffer
exp.resize_img = function(inname, size, callback) {
  lwip.open(inname, function(err, image) {
    if (err) {
      callback(err, null);
    } else {
      image.batch()
      .resize(size, size, "nearest-neighbor") // nearest-neighbor doesn't blur
      .toBuffer("png", function(err, buffer) {
        callback(null, buffer);
      });
    }
  });
};

// returns "alex" or "steve" calculated by the +uuid+
exp.default_skin = function(uuid) {
  if (uuid.length <= 16) {
    // we can't get the
    return "steve";
  } else {
    // great thanks to Minecrell for research into Minecraft and Java's UUID hashing!
    // https://git.io/xJpV
    // MC uses `uuid.hashCode() & 1` for alex
    // that can be compacted to counting the LSBs of every 4th byte in the UUID
    // an odd sum means alex, an even sum means steve
    // XOR-ing all the LSBs gives us 1 for alex and 0 for steve
    var lsbs_even = parseInt(uuid[07], 16) ^
                    parseInt(uuid[15], 16) ^
                    parseInt(uuid[23], 16) ^
                    parseInt(uuid[31], 16);
      return lsbs_even ? "alex" : "steve";
  }
};

// helper method for opening a skin file from +skinpath+
// callback contains error, image buffer
exp.open_skin = function(rid, skinpath, callback) {
  fs.readFile(skinpath, function(err, buf) {
    if (err) {
      logging.error(rid + "error while opening skin file: " + err);
      callback(err, null);
    } else {
      callback(null, buf);
    }
  });
};

exp.save_image = function(buffer, outpath, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.batch()
      .writeFile(outpath, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    }
  });
};

module.exports = exp;