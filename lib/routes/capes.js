var helpers = require("../helpers");
var cache = require("../cache");

// GET cape request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[1] || "").split(".")[0];
  var def = req.url.query.default;
  var rid = req.id;

  // check for extra paths
  if (req.url.path_list.length > 2) {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404
    });
    return;
  }

  if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UUID"
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");

  try {
    helpers.get_cape(rid, userId, function(err, hash, status, image) {
      if (err) {
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