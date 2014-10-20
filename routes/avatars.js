var express = require('express');
var router = express.Router();
var skins = require('../skins');
var fs = require('fs');

var valid_uuid = /^[0-9a-f]{32}$/;

/* GET home page. */
router.get('/:uuid/:size?', function(req, res) {
  var uuid = req.param('uuid');
  var size = req.param('size') || 180;
  var def = req.query.default;
  var start = new Date();
  // Prevent app from crashing/freezing
  if (size <= 0 || size > 512) size = 180;
  if (valid_uuid.test(uuid)) {
    var filename = uuid + ".png";
    if (fs.existsSync("skins/" + filename)) {
      console.log('found ' + filename);
      skins.resize_img("skins/" + filename, size, function(data) {
        // tell browser to cache image locally for 10 minutes
        var end = new Date() - start;
        res.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=600, public', 'Response-Time': end, 'Storage-Type': 'local'});
        res.end(data);
      });
    } else {
      console.log(filename + ' not found, downloading profile..');
      skins.get_profile(uuid, function(profile) {
        var skinurl = skins.skin_url(profile);
        if (skinurl) {
          console.log('got profile, skin url is "' + skinurl + '" downloading..');
          skins.skin_file(skinurl, filename, function() {
            console.log('got skin');
            skins.resize_img("skins/" + filename, size, function(data) {
              // tell browser to cache image locally for 10 minutes
              var end = new Date() - start;
              res.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=600, public', 'Response-Time': end, 'Storage-Type': 'downloaded'});
              res.end(data);
            });
          });
        } else {
          console.log('no skin url found');
          switch (def) {
            case "alex":
              skins.resize_img("public/images/alex.png", size, function(data) {
                // tell browser to cache image locally for 10 minutes
                var end = new Date() - start;
                res.writeHead(404, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=600, public', 'Response-Time': end, 'Storage-Type': 'local'});
                res.end(data);
              });
              break;
            case "steve":
              skins.resize_img("public/images/steve.png", size, function(data) {
                // tell browser to cache image locally for 10 minutes
                var end = new Date() - start;
                res.writeHead(404, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=600, public', 'Response-Time': end, 'Storage-Type': 'local'});
                res.end(data);
              });
              break;
            default:
              res.status(404).send('404 Not found');
              break;
          }
        }
      });
    }
  } else {
    res.status(422) // "Unprocessable Entity", valid request, but semantically erroneous: https://tools.ietf.org/html/rfc4918#page-78
    .send("422 Invalid UUID");
  }
});

module.exports = router;
