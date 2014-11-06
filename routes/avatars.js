var helpers = require('../modules/helpers');
var router = require('express').Router();
var config = require('../modules/config');
var skins = require('../modules/skins');

/* GET avatar request. */
router.get('/:uuid.:ext?', function(req, res) {
  var uuid = req.params.uuid;
  var size = req.query.size || config.default_size;
  var def = req.query.default;
  var helm = req.query.hasOwnProperty('helm');
  var start = new Date();

  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    res.status(422).send("422 Invalid size");
    return;
  } else if (!helpers.uuid_valid(uuid)) {
    res.status(422).send("422 Invalid UUID");
    return;
  }

  try {
    helpers.get_avatar(uuid, helm, size, function(err, status, image) {
      console.log(uuid + " - " + status);
      if (err) {
        console.error(err);
        if (image) {
          console.warn("error occured, image found anyway");
          sendimage(503, true, image);
        } else {
          handle_default(404);
        }
      } else if (status == 1 || status == 2) {
        sendimage(200, status == 1, image);
      } else if (status === 0 || status == 3) {
        handle_default(404);
      } else {
        console.error("unexpected error/status");
        console.error("error: " + err);
        console.error("status: " + status);
        handle_default(404);
      }
    });
  } catch(e) {
    console.error("Error!");
    console.error(e);
    handle_default(500);
  }

  function handle_default(status) {
    if (def != "steve" && def != "alex") {
      def = skins.default_skin(uuid);
    }
    skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
      sendimage(status, true, image);
    });
  }

  function sendimage(status, local, image) {
    res.writeHead(status, {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=' + config.browser_cache_time + ', public',
      'Response-Time': new Date() - start,
      'X-Storage-Type': local ? 'local' : 'downloaded'
    });
    res.end(image);
  }
});


module.exports = router;