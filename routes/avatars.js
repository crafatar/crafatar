var express = require('express');
var router = express.Router();
var skins = require('../skins');
var fs = require('fs');

var valid_uuid = /^[0-9a-f]{32}$/;

/* GET home page. */
router.get('/:uuid/:size?', function(req, res) {
  var uuid = req.param('uuid');
  var size = req.param('size') || 180;
  // Prevent app from crashing/freezing
  if (size <= 0 || size > 512) size = 180;
  console.log(uuid);
  if (valid_uuid.test(uuid)) {
    var filename = uuid + ".png";
    if (fs.existsSync("skins/" + filename)) {
      skins.resize_img(filename, size, function(data) {
        res.writeHead(200, {'Content-Type': 'image/png'});
        res.end(data);
      });
    } else {
      skins.get_profile(uuid, function(profile) {
        var skinurl = skins.skin_url(profile);
        if (skinurl) {
          skins.skin_file(skinurl, filename, function() {
            skins.resize_img(filename, size, function(data) {
              res.writeHead(200, {'Content-Type': 'image/png'});
              res.end(data);
            });
          });
        } else {
          res.status(404)        // HTTP status 404: NotFound
          .send('404 Not found');
        }
      });
    }
  } else {
    res.status(422) // "Unprocessable Entity", valid request, but semantically erroneous: https://tools.ietf.org/html/rfc4918#page-78
    .send("422 Invalid UUID");
  }
});

module.exports = router;
