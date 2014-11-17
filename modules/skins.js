var lwip = require('lwip');

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
exp.extract_helm = function(facefile, buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, skin) {
    if (err) {
      callback(err);
    } else {
      lwip.open(facefile, function(err, face_img) {
        if (err) {
          callback(err);
        } else {
          skin.crop(40, 8, 47, 15, function(err, helm_img) {
            if (err) {
              callback(err);
            } else {
              face_img.paste(0, 0, helm_img, function(err, face_helm_img) {
                if (err) {
                  callback(err);
                } else {
                  face_helm_img.writeFile(outname, function(err) {
                    if (err) {
                      callback(err);
                    } else {
                      callback(null);
                      // JavaScript callback hell <3
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
// +callback+ contains error, image buffer
exp.resize_img = function(inname, size, callback) {
  lwip.open(inname, function(err, image) {
    if (err) {
      callback(err, null);
    } else {
      image.batch()
      .resize(size, size, "nearest-neighbor") // nearest-neighbor doesn't blur
      .toBuffer('png', function(err, buffer) {
        callback(null, buffer);
      });
    }
  });
};

// returns "alex" or "steve" calculated by the +uuid+
exp.default_skin = function(uuid) {
  if (Number("0x" + uuid[31]) % 2 === 0) {
    return "alex";
  } else {
    return "steve";
  }
};

module.exports = exp;