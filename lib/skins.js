var logging = require("./logging");
var lwip = require("lwip");
var fs = require("fs");
let Bluebird = require('bluebird');
Bluebird.promisifyAll(lwip)
Bluebird.promisifyAll(require('lwip/lib/Image').prototype)
Bluebird.promisifyAll(require('lwip/lib/Batch').prototype)

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
      .opacify()          // remove transparency
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
            if (buf_err) {
              callback(buf_err);
            } else {
              // crop to hat transparency-bounding-box
              skin_img.crop(32, 0, 63, 31, function(area_err, helm_area) {
                if (area_err) {
                  callback(area_err);
                } else {
                  /* eslint-disable no-labels */
                  var is_opaque = true;
                  if (skin_img.__trans) { // eslint-disable-line no-underscore-dangle
                    xloop:
                    for (var x = 0; x < helm_area.width(); x++) {
                      for (var y = 0; y < helm_area.height(); y++) {
                        // check if transparency-bounding-box has transparency
                        if (helm_area.getPixel(x, y).a !== 100) {
                          is_opaque = false;
                          break xloop;
                        }
                      }
                    }
                    /* eslint-enable no-labels */
                  } else {
                    is_opaque = true;
                  }
                  skin_img.crop(8, 8, 15, 15, function(crop_err, helm_img) {
                    if (crop_err) {
                      callback(crop_err);
                    } else {
                      face_img.paste(0, 0, helm_img, function(img_err, face_helm_img) {
                        if (img_err) {
                          callback(img_err);
                        } else {
                          if (is_opaque) {
                            logging.debug(rid, "Skin is not transparent, skipping helm!");
                            callback(null);
                          } else {
                            face_helm_img.toBuffer("png", {compression: "none"}, function(buf_err2, face_helm_buffer) {
                              if (buf_err2) {
                                callback(buf_err2);
                              } else {
                                if (face_helm_buffer.toString() !== face_buffer.toString()) {
                                  face_helm_img.writeFile(outname, function(write_err) {
                                    callback(write_err);
                                  });
                                } else {
                                  logging.debug(rid, "helm img == face img, not storing!");
                                  callback(null);
                                }
                              }
                            });
                          }
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};

// resizes the image file +inname+ to +size+ by +size+ pixels
exp.resize_img = function(inname, size) {
  return lwip.openAsync(inname)
    .then(image => image.batch().resize(size, size, "nearest-neighbor").toBufferAsync('png')) // nearest-neighbor doesn't blur
};

// returns "mhf_alex" or "mhf_steve" calculated by the +uuid+
exp.default_skin = function(uuid) {
  if (uuid.length <= 16) {
    if (uuid.toLowerCase() === "mhf_alex") {
      return uuid;
    } else {
      // we can't get the skin type by username
      return "mhf_steve";
    }
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
    return lsbs_even ? "mhf_alex" : "mhf_steve";
  }
};

// helper method for opening a skin file from +skinpath+
// callback: error, image buffer
exp.open_skin = function(rid, skinpath, callback) {
  fs.readFile(skinpath, function(err, buf) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, buf);
    }
  });
};

// write the image +buffer+ to the +outpath+ file
// the image is stripped down by lwip.
// callback: error
exp.save_image = function(buffer, outpath, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.writeFile(outpath, function(write_err) {
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
