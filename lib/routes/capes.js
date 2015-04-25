var logging = require("../logging");
var helpers = require("../helpers");
var cache = require("../cache");

// GET cape request
module.exports = function(req, callback) {
  var userId = (req.url.pathname.split("/")[2] || "").split(".")[0];
  var def = req.url.query.default;
  var rid = req.id;

  if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid userid"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    helpers.get_cape(rid, userId, function(err, hash, status, image) {
      if (err) {
        logging.error(rid, err);
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(rid, userId);
        }
      }
      callback({
        status: status,
        body: image,
        type: image ? "image/png" : undefined,
        redirect: image ? undefined : def,
        hash: hash,
        err: err
      });
    });
  } catch(e) {
    callback({
      status: -1,
      err: e
    });
  }
};