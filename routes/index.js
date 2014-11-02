var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Crafatar', domain: "https://" + req.headers.host, commit: process.env.COMMIT_HASH || "unknown" });
});


module.exports = router;