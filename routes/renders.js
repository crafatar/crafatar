var router = require('express').Router();
var networking = require('../modules/networking');
var logging = require('../modules/logging');
var helpers = require('../modules/helpers');
var config = require('../modules/config');
var skins = require('../modules/skins');
var renders = require('../modules/renders');
var fs = require('fs');

var human_status = {
  0: "none",
  1: "cached",
  2: "downloaded",
  3: "checked",
  "-1": "error"
};

// valid types: head, body. helmet is query param

// The Type logic should be two separate GET 
// functions once response methods are extracted
router.get('/:type/:uuid.:ext?', function(req, res) {
  var raw_type = req.params.type;

  // Check valid type for now
  if (raw_type != "body" && raw_type != "head") {
    res.status(404).send("404 Invalid Render Type");
    return;
  }

  var body = raw_type == "head" ? false : true
  var uuid = req.params.uuid;
  var def = req.params.def;
  var scale = parseInt(req.query.scale) || config.default_scale;
  var helm = req.query.hasOwnProperty('helm');
  var start = new Date();
  var etag = null;

  if (scale > config.maximum_scale) {
    // Preventing from OOM crashes.
    res.status(422).send("422 Invalid Size");
  } else if (!helpers.uuid_valid(uuid)) {
    res.status(422).send("422 Invalid UUID");
    return;
  }

  // strip dashes
  uuid = uuid.replace(/-/g, "");

  try {
    helpers.get_render(uuid, scale, helm, body, function(err, status, hash, image) {
      logging.log(uuid + " - " + human_status[status]);
      if (err) {
        logging.error(err);
      }
      etag = hash && hash.substr(0, 32) || "none";
      var matches = req.get("If-None-Match") == '"' + etag + '"';
      if (image) {
        var http_status = 200;
        if (matches) {
          http_status = 304;
        } else if (err) {
          http_status = 503;
        }
        logging.log("matches: " + matches);
        logging.log("Etag: " + req.get("If-None-Match"));
        logging.log("status: " + http_status);
        sendimage(http_status, status, image);
      } else {
        handle_default(404, status);
      }
    });
  } catch(e) {
    logging.error("Error!");
    logging.error(e);
    handle_default(500, status);
  }

  function handle_default(http_status, img_status) {
    if (def && def != "steve" && def != "alex") {
      res.writeHead(301, {
        'Cache-Control': 'max-age=' + config.browser_cache_time + ', public',
        'Response-Time': new Date() - start,
        'X-Storage-Type': human_status[img_status],
        'Access-Control-Allow-Origin': '*',
        'Location': def
      });
      res.end();
    } else {
      def = def || skins.default_skin(uuid);
      fs.readFile("public/images/" + def + ".png", function (err, buf) {
        if (err) throw err;
        console.log(buf);
        renders.draw_model(uuid, buf, scale, helm, body, function(err, status, image) {
          sendimage(http_status, img_status, image);
        });
      });
    }
  }

  function sendimage(http_status, img_status, image) {
    res.writeHead(http_status, {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=' + config.browser_cache_time + ', public',
      'Response-Time': new Date() - start,
      'X-Storage-Type': human_status[img_status],
      'Access-Control-Allow-Origin': '*',
      'Etag': '"' + etag + '"'
    });
    res.end(http_status == 304 ? null : image);
  }
});

module.exports = router;