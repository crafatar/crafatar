var express = require('express');
var router = express.Router();
var skins = require('../skins');
var fs = require('fs');

var valid_uuid = /^[0-9a-f]{32}$/;

/* GET home page. */
router.get('/:uuid/:size?', function(req, res) {
  //res.render('index', { title: 'Express' });
  //res.send("uuid is set to " + req.param("uuid"));
  //console.log(req.param('size'))
  var uuid = req.param('uuid');
  var size = req.param('size') || 180;
  // Add temporary restriction to prevent app from crashing
  if (size <= 0) {
    size = 180;
  }
  console.log(uuid);
  if (valid_uuid.test(uuid)) {
    var filename = 'skins/' + uuid + ".png";
    if (fs.existsSync(filename)) {
      skins.extract_face(filename, size, function() {
        skins.extract_face(filename, size, function(data) {
          res.writeHead(200, {'Content-Type': 'image/png'});
          res.end(data);
        });
      });
    } else {
      skins.get_profile(uuid, function(profile) {
        var skinurl = skins.skin_url(profile);
        if (skinurl) {
          skins.skin_file(skinurl, filename, function() {
            skins.extract_face(filename, size, function(data) {
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
