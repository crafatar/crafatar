var lwip = require('lwip');

var exp = {};

// extracts the face from an image +buffer+
// save it to a file called +outname+
// callback has an error parameter which can be null
exp.extract_face = function(buffer, outname, callback) {
  lwip.open(buffer, "png", function(err, image) {
    if (err) {
      callback(err);
    } else {
      image.batch()
      .crop(8, 8, 15, 15)
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

// resizes the image file +inname+ to +size+ by +size+ pixels
// +callback+ is a buffer of the resized image
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

module.exports = exp;