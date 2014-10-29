var networking = require('../modules/networking');
var helpers = require('../modules/helpers');
var router = require('express').Router();
var config = require('../modules/config');
var skins = require('../modules/skins');
var fs = require('fs');

/* GET avatar request. */
router.get('/:uuid/:size?', function(req, res) {
  var uuid = req.param('uuid');
  var size = req.param('size') || config.default_size;
  var def = req.query.default;
  var start = new Date();

  // Prevent app from crashing/freezing
  if (size <= config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    res.status(422).send("422 Invalid size");
    return;
  } else if (!helpers.uuid_valid(uuid)) {
    res.status(422).send("422 Invalid UUID");
    return;
  }

  try {
    helpers.get_avatar(uuid, size, function(err, status, image) {
      if (err) {
        console.error(err);
        handle_404(def);
      } else if (status == 1 || status == 2) {
        var time = new Date() - start;
        sendimage(200, time, image);
      } else if (status == 3) {
        handle_404(def);
      }
    });
  } catch(e) {
    console.error("Error!");
    console.error(e);
    res.status(500).send("500 Internal server error");
  }

  function handle_404(def) {
    if (def == "alex" || def == "steve") {
      skins.resize_img("public/images/" + def + ".png", size, function(image) {
        var time = new Date() - start;
        sendimage(404, time, image);
      });
    } else {
      res.status(404).send('404 Not found');
    }
  }

  function sendimage(status, time, image) {
    res.writeHead(status, {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=' + config.browser_cache_time + ', public',
      'Response-Time': time,
      'X-Storage-Type': 'local'
    });
    res.end(image);
  }
});


module.exports = router;