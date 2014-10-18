var express = require('express');
var router = express.Router();
var skins = require('../skins');
var fs = require('fs')

/* GET home page. */
router.get('/:uuid', function(req, res) {
  //res.render('index', { title: 'Express' });
  //res.send("uuid is set to " + req.param("uuid"));
  uuid = req.param('uuid')
  var filename = 'skins/' + uuid + ".png";
  if (fs.existsSync(filename)) {
      fs.readFile(filename, function(err, data) {
      res.writeHead(200, {'Content-Type': 'image/jpeg'});
      res.end(data);
    });
  } else {
    skins.get_profile(uuid, function(profile) {
    	var skinurl = skins.skin_url(profile);
    	if (skinurl) {
    		skins.skin_file(skinurl, filename, function() {
    			skins.extract_face(filename, filename, function() {
    				fs.readFile(filename, function(err, data) {
              res.writeHead(200, {'Content-Type': 'image/jpeg'});
              res.end(data);
            });
    			});
    		});
    	} else {
    		res.send("No skin found.");
    	}
    });
  }
});

module.exports = router;
