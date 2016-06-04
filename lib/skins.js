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
exp.extract_face = function(buffer, outname) {
  lwip.openAsync(buffer, "png")
    .then(image => image.batch()
      .crop(8, 8, 15, 15) // face
      .opacify() // remove transparency
      .writeFileAsync(outname))
    .catch(function(err) {
      throw new Error('ExtractFaceError');
    });
};

// extracts the helm from an image +buffer+ and lays it over a +facefile+
// +facefile+ is the filename of an image produced by extract_face
// result is saved to a file called +outname+
// callback: error
exp.extract_helm = function(rid, facefile, buffer, outname, callback) {
  let skin_img;
  let face_img;
  let is_opaque = true;
  return Promise.all(lwip.openAsync(buffer, 'png'), lwip.openAsync(facefile))
    .then(function(results) {
      skin_img = results[0];
      face_img = results[1];

      /* eslint-disable no-labels */
      if (skin_img.__trans) { // eslint-disable-line no-underscore-dangle
        xloop:
        // Helm area from x = 32 to 63, y = 0 to 31
          for (var x = 32; x <= 63; x++) {
            for (var y = 0; y <= 31; y++) {
              // check if transparency-bounding-box has transparency
              if (skin_img.getPixel(x, y).a !== 100) {
                is_opaque = false;
                break xloop;
              }
            }
          }
          /* eslint-enable no-labels */
      }
      return skin_img.cropAsync(8, 8, 15, 15);
    }).then(helm_img => face_img.pasteAsync(0, 0, helm_img))
    .then(function(face_helm_img) {
      if (is_opaque) {
        logging.debug(rid, "Skin is not transparent, skipping helm!");
      } else {
        return Promise.all(face_img.toBufferAsync('png', {
            compression: "none"
          }), face_helm_img.toBufferAsync('png', {
            compression: "none"
          }))
          .then(function(results) {
            let face_buffer = results[0];
            let face_helm_buffer = results[1];

            if (face_helm_buffer.toString() !== face_buffer.toString()) {
              return face_helm_img.writeFileAsync(outname);
            } else {
              logging.debug(rid, "helm img == face img, not storing!");
            }
          })
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
    var lsbs_even = parseInt(uuid[7], 16) ^
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
