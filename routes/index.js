var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', {
    title: 'Crafatar',
    domain: "https://" + req.headers.host,
    // see http://stackoverflow.com/a/14924922/2517068
    commit: process.env.HEAD_HASH || "unknown"
  });
});


module.exports = router;