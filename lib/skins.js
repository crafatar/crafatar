var logging = require("./logging");
var lwip = require("lwip");
var fs = require("fs");

var exp = {};

// extracts the face from an image +buffer+
// result is saved to a file called +outname+
// callback: error
exp.extract_face = function(buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.batch()
      .crop(8, 8, 15, 15) // face
      .writeFile(outname, function(write_err) {
        if (write_err) {
          callback(write_err);
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
// callback: error
exp.extract_helm = function(rid, facefile, buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, skin_img) {
    if (err) {
      callback(err);
    } else {
      lwip.open(facefile, function(open_err, face_img) {
        if (open_err) {
          callback(open_err);
        } else {
          face_img.toBuffer("png", { compression: "none" }, function(buf_err, face_buffer) {
            // FIXME: buf_err is not handled
            skin_img.crop(40, 8, 47, 15, function(crop_err, helm_img) {
              if (crop_err) {
                callback(crop_err);
              } else {
                face_img.paste(0, 0, helm_img, function(img_err, face_helm_img) {
                  if (img_err) {
                    callback(img_err);
                  } else {
                    if (!skin_img.__trans) {
                      logging.log(rid, "Skin is not transparent, skipping helm!");
                      callback(null);
                    } else {
                      face_helm_img.toBuffer("png", {compression: "none"}, function(buf_err2, face_helm_buffer) {
                        // FIXME: buf_err2 is not handled
                        if (face_helm_buffer.toString() !== face_buffer.toString()) {
                          face_helm_img.writeFile(outname, function(write_err) {
                            callback(write_err);
                          });
                        } else {
                          logging.log(rid, "helm img == face img, not storing!");
                          callback(null);
                        }
                      });
                    }
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
// callback: error, image buffer
exp.resize_img = function(inname, size, callback) {
  lwip.open(inname, function(err, image) {
    if (err) {
      callback(err, null);
    } else {
      image.batch()
      .resize(size, size, "nearest-neighbor") // nearest-neighbor doesn't blur
      .toBuffer("png", function(buf_err, buffer) {
        // FIXME: buf_err is not handled
        callback(null, buffer);
      });
    }
  });
};

// returns "alex" or "steve" calculated by the +uuid+
exp.default_skin = function(uuid) {
  if (uuid.length <= 16) {
    // we can't get the skin type by username
    return "steve";
  } else {
    // great thanks to Minecrell for research into Minecraft and Java's UUID hashing!
    // https://git.io/xJpV
    // MC uses `uuid.hashCode() & 1` for alex
    // that can be compacted to counting the LSBs of every 4th byte in the UUID
    // an odd sum means alex, an even sum means steve
    // XOR-ing all the LSBs gives us 1 for alex and 0 for steve
    var lsbs_even = parseInt(uuid[ 7], 16) ^
                    parseInt(uuid[15], 16) ^
                    parseInt(uuid[23], 16) ^
                    parseInt(uuid[31], 16);
    return lsbs_even ? "alex" : "steve";
  }
};

// helper method for opening a skin file from +skinpath+
// callback: error, image buffer
exp.open_skin = function(rid, skinpath, callback) {
  fs.readFile(skinpath, function(err, buf) {
    if (err) {
      logging.error(rid, "error while opening skin file:", err);
      callback(err, null);
    } else {
      callback(null, buf);
    }
  });
};

// write the image +buffer+ to the +outpath+ file
// callback: error
exp.save_image = function(buffer, outpath, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.batch()
      .writeFile(outpath, function(write_err) {
        if (write_err) {
          callback(write_err);
        } else {
          callback(null);
        }
      });
    }
  });
};

module.exports = exp;