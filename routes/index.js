var express = require('express');
var config = require('../modules/config');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', {
    title: 'Crafatar',
    domain: "https://" + req.headers.host,
    config: config
  });
});


module.exports = router;