var express = require('express');
var router = express.Router();
var skins = require('../skins');
var fs = require('fs')

/* GET home page. */
router.get('/:uuid/:size?', function(req, res) {
  //res.render('index', { title: 'Express' });
  //res.send("uuid is set to " + req.param("uuid"));
  //console.log(req.param('size'))
  var uuid = req.param('uuid')
  var size = req.param('size')
  if (size == null) {
    size = 180;
  }
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
        .send('404 Not found')
      }
    });
  }
});

module.exports = router;
