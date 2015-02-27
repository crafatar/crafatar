var assert = require("assert");
var fs = require("fs");
var networking = require("../lib/networking");
var helpers = require("../lib/helpers");
var logging = require("../lib/logging");
var config = require("../lib/config");
var skins = require("../lib/skins");
var cache = require("../lib/cache");
var renders = require("../lib/renders");
var server = require("../server");
var cleaner = require("../lib/cleaner");
var request = require("request");

// we don't want tests to fail because of slow internet
config.http_timeout *= 3;

// no spam
if (process.env.VERBOSE_TEST !== "true") {
  logging.log = function() {};
}

var uuids = fs.readFileSync("test/uuids.txt").toString().split(/\r?\n/);
var names = fs.readFileSync("test/usernames.txt").toString().split(/\r?\n/);

// Get a random UUID + name in order to prevent rate limiting
var uuid = uuids[Math.round(Math.random() * (uuids.length - 1))];
var name = names[Math.round(Math.random() * (names.length - 1))];


// Let's hope these will never be assigned
var steve_ids = [
  "fffffff0"+"fffffff0"+"fffffff0"+"fffffff0",
  "fffffff0"+"fffffff0"+"fffffff1"+"fffffff1",
  "fffffff0"+"fffffff1"+"fffffff0"+"fffffff1",
  "fffffff0"+"fffffff1"+"fffffff1"+"fffffff0",
  "fffffff1"+"fffffff0"+"fffffff0"+"fffffff1",
  "fffffff1"+"fffffff0"+"fffffff1"+"fffffff0",
  "fffffff1"+"fffffff1"+"fffffff0"+"fffffff0",
  "fffffff1"+"fffffff1"+"fffffff1"+"fffffff1",
];
// Let's hope these will never be assigned
var alex_ids = [
  "fffffff0"+"fffffff0"+"fffffff0"+"fffffff1",
  "fffffff0"+"fffffff0"+"fffffff1"+"fffffff0",
  "fffffff0"+"fffffff1"+"fffffff0"+"fffffff0",
  "fffffff0"+"fffffff1"+"fffffff1"+"fffffff1",
  "fffffff1"+"fffffff0"+"fffffff0"+"fffffff0",
  "fffffff1"+"fffffff0"+"fffffff1"+"fffffff1",
  "fffffff1"+"fffffff1"+"fffffff0"+"fffffff1",
  "fffffff1"+"fffffff1"+"fffffff1"+"fffffff0",
];

var rid = "TestReqID: ";

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var ids = [
  uuid.toLowerCase(),
  name.toLowerCase(),
  name.toUpperCase(),
  uuid.toUpperCase(),
];

describe("Crafatar", function() {
  // we might have to make 2 HTTP requests
  this.timeout(config.http_timeout * 2 + 50);

  before(function() {
    cache.get_redis().flushall();
    // cause I don't know how big hard drives are these days
    config.cleaning_disk_limit = Infinity;
    config.cleaning_redis_limit = Infinity;
    cleaner.run();
  });

  describe("UUID/username", function() {
    it("non-hex uuid is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("g098cb60fa8e427cb299793cbd302c9a"), false);
      done();
    });
    it("empty id is invalid", function(done) {
      assert.strictEqual(helpers.id_valid(""), false);
      done();
    });
    it("non-alphanumeric username is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("usernäme"), false);
      done();
    });
    it("dashed username is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("user-name"), false);
      done();
    });
    it(">16 length username is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("ThisNameIsTooLong"), false);
      done();
    });
    it("lowercase uuid is valid", function(done) {
      assert.strictEqual(helpers.id_valid("0098cb60fa8e427cb299793cbd302c9a"), true);
      done();
    });
    it("uppercase uuid is valid", function(done) {
      assert.strictEqual(helpers.id_valid("1DCEF164FF0A47F2B9A691385C774EE7"), true);
      done();
    });
    it("dashed uuid is valid", function(done) {
      assert.strictEqual(helpers.id_valid("0098cb60-fa8e-427c-b299-793cbd302c9a"), true);
      done();
    });
    it("16 chars, underscored, capital, numbered username is valid", function(done) {
      assert.strictEqual(helpers.id_valid("__niceUs3rname__"), true);
      done();
    });
    it("1 char username is valid", function(done) {
      assert.strictEqual(helpers.id_valid("a"), true);
      done();
    });
    it("should not exist (uuid)", function(done) {
      var number = getRandomInt(0, 9).toString();
      networking.get_profile(rid, Array(33).join(number), function(err, profile) {
        assert.strictEqual(profile, null);
        done();
      });
    });
    it("should not exist (username)", function(done) {
      networking.get_username_url(rid, "Steve", 0, function(err, profile) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });
  describe("Avatar", function() {
    it("uuid's account should exist, but skin should not", function(done) {
      // profile "Alex" - hoping it'll never have a skin
      networking.get_profile(rid, "ec561538f3fd461daff5086b22154bce", function(err, profile) {
        assert.notStrictEqual(profile, null);
        networking.get_uuid_url(profile, 1, function(url) {
          assert.strictEqual(url, null);
          done();
        });
      });
    });
    for (var a in alex_ids) {
      var alex_id = alex_ids[a];
      (function(alex_id) {
        it("UUID " + alex_id + " should default to Alex", function(done) {
          assert.strictEqual(skins.default_skin(alex_id), "alex");
          done();
        });
      })(alex_id);
    }
    for (var s in steve_ids) {
      var steve_id = steve_ids[s];
      (function(steve_id) {
        it("UUID " + steve_id + " should default to Steve", function(done) {
          assert.strictEqual(skins.default_skin(steve_id), "steve");
          done();
        });
      })(steve_id);
    }
  });
  describe("Errors", function() {
    it("should time out on uuid info download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_profile(rid, "069a79f444e94726a5befca90e38aaf5", function(err, profile) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on username info download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_username_url(rid, "jomo", 0, function(err, url) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on skin download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_from(rid, "http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", function(body, res, error) {
        assert.strictEqual(error.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should not find the skin", function(done) {
      assert.doesNotThrow(function() {
        networking.get_from(rid, "http://textures.minecraft.net/texture/this-does-not-exist", function(img, response, err) {
          assert.strictEqual(err, null); // no error here, but it shouldn't throw exceptions
          done();
        });
      });
    });
    it("should ignore file updates on invalid files", function(done) {
      assert.doesNotThrow(function() {
        cache.update_timestamp(rid, "0123456789abcdef0123456789abcdef", "invalid-file.png", false, function(err) {
          done();
        });
      });
    });
    it("should not find the file", function(done) {
      skins.open_skin(rid, "non/existent/path", function(err, img) {
        assert.notStrictEqual(err, null);
        done();
      });
    });
  });

  describe("Server", function() {
    before(function(done) {
      server.boot(function() {
        done();
      });
    });

    // Test the home page
    it("should return a 200 (home page)", function(done) {
      request.get("http://localhost:3000", function(error, res, body) {
        assert.equal(200, res.statusCode);
        done();
      });
    });

    it("should return a 200 (asset request)", function(done) {
      request.get("http://localhost:3000/stylesheets/style.css", function(error, res, body) {
        assert.equal(200, res.statusCode);
        done();
      });
    });

    // invalid method, we only allow GET and HEAD requests
    it("should return a 405 (invalid method)", function(done) {
      request.post("http://localhost:3000", function(error, res, body) {
        assert.equal(405, res.statusCode);
        done();
      });
    });

    it("should return a 422 (invalid size)", function(done) {
      var size = config.max_size + 1;
      request.get("http://localhost:3000/avatars/Jake_0?size=" + size, function(error, res, body) {
        assert.equal(422, res.statusCode);
        done();
      });
    });

    it("should return a 422 (invalid scale)", function(done) {
      var scale = config.max_scale + 1;
      request.get("http://localhost:3000/renders/head/Jake_0?scale=" + scale, function(error, res, body) {
        assert.equal(422, res.statusCode);
        done();
      });
    });

    // no default images for capes, should 404
    it("should return a 404 (no cape)", function(done) {
      request.get("http://localhost:3000/capes/Jake_0", function(error, res, body) {
        assert.equal(404, res.statusCode);
        done();
      });
    });

    it("should return a 422 (invalid render type)", function(done) {
      request.get("http://localhost:3000/renders/side/Jake_0", function(error, res, body) {
        assert.equal(422, res.statusCode);
        done();
      });
    });

    // testing all paths for valid inputs
    var locations = ["avatars", "skins", "renders/head"];
    for (var l in locations) {
      var location = locations[l];
      (function(location) {
        it("should return a 200 (valid input " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/Jake_0", function(error, res, body) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
        it("should return a 422 (invalid id " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/thisisaninvaliduuid", function(error, res, body) {
            assert.equal(422, res.statusCode);
            done();
          });
        });
      })(location);
    }

    // testing all paths for invalid id formats
    locations = ["avatars", "capes", "skins", "renders/head"];
    for (l in locations) {
      var location = locations[l];
      (function(location) {
        it("should return a 422 (invalid id " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/thisisaninvaliduuid", function(error, res, body) {
            assert.equal(422, res.statusCode);
            done();
          });
        });
      })(location);
    }

    //testing all paths for default images
    locations = ["avatars", "skins", "renders/head"];
    for (l in locations) {
      var location = locations[l];
      (function(location) {
        it("should return a 404 (default steve image " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/invalidjsvns?default=steve", function(error, res, body) {
            assert.equal(404, res.statusCode);
            done();
          });
        });
        it("should return a 200 (default external image " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/invalidjsvns?default=https%3A%2F%2Fi.imgur.com%2FocJVWAc.png", function(error, res, body) {
            assert.equal(200, res.statusCode);
            done();
          });
        });
      })(location);
    }

    after(function(done) {
      server.close(function() {
        done();
      });
    });
  });

  // we have to make sure that we test both a 32x64 and 64x64 skin
  describe("Networking: Render", function() {
    it("should not fail (username, 32x64 skin)", function(done) {
      helpers.get_render(rid, "md_5", 6, true, true, function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not fail (username, 64x64 skin)", function(done) {
      helpers.get_render(rid, "Jake_0", 6, true, true, function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe("Networking: Cape", function() {
    it("should not fail (guaranteed cape)", function(done) {
      helpers.get_cape(rid, "Dinnerbone", function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should already exist", function(done) {
      before(function() {
        cache.get_redis().flushall();
      });
      helpers.get_cape(rid, "Dinnerbone", function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not be found", function(done) {
      helpers.get_cape(rid, "Jake_0", function(err, hash, img) {
        assert.strictEqual(img, null);
        done();
      });
    });
  });

  describe("Networking: Skin", function() {
    it("should not fail", function(done) {
      helpers.get_cape(rid, "Jake_0", function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should already exist", function(done) {
      before(function() {
        cache.get_redis().flushall();
      });
      helpers.get_cape(rid, "Jake_0", function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });


  // DRY with uuid and username tests
  for (var i in ids) {
    var id = ids[i];
    var id_type = id.length > 16 ? "uuid" : "name";
    // needs an anonymous function because id and id_type aren't constant
    (function(id, id_type) {
      describe("Networking: Avatar", function() {
        before(function() {
          cache.get_redis().flushall();
          console.log("\n\nRunning tests with " + id_type + " '" + id + "'\n\n");
        });

        it("should be downloaded", function(done) {
          helpers.get_avatar(rid, id, false, 160, function(err, status, image) {
            assert.strictEqual(status, 2);
            done();
          });
        });
        it("should be cached", function(done) {
          helpers.get_avatar(rid, id, false, 160, function(err, status, image) {
            assert.strictEqual(status === 0 || status === 1, true);
            done();
          });
        });
        if (id.length > 16) {
          console.log("can't run 'checked' test due to Mojang's rate limits :(");
        } else {
          it("should be checked", function(done) {
            var original_cache_time = config.local_cache_time;
            config.local_cache_time = 0;
            helpers.get_avatar(rid, id, false, 160, function(err, status, image) {
              assert.strictEqual(status, 3);
              config.local_cache_time = original_cache_time;
              done();
            });
          });
        }
      });

      describe("Networking: Skin", function() {
        it("should not fail (uuid)", function(done) {
          helpers.get_skin(rid, id, function(err, hash, img) {
            assert.strictEqual(err, null);
            done();
          });
        });
      });

      describe("Networking: Render", function() {
        it("should not fail (full body)", function(done) {
          helpers.get_render(rid, id, 6, true, true, function(err, hash, img) {
            assert.strictEqual(err, null);
            done();
          });
        });
        it("should not fail (only head)", function(done) {
          helpers.get_render(rid, id, 6, true, false, function(err, hash, img) {
            assert.strictEqual(err, null);
            done();
          });
        });
      });

      describe("Networking: Cape", function() {
        it("should not fail (possible cape)", function(done) {
          helpers.get_cape(rid, id, function(err, hash, img) {
            assert.strictEqual(err, null);
            done();
          });
        });
      });


      describe("Errors", function() {
        before(function() {
          cache.get_redis().flushall();
        });

        if (id_type == "uuid") {
          it("uuid should be rate limited", function(done) {
            networking.get_profile(rid, id, function(err, profile) {
              assert.strictEqual(profile.error, "TooManyRequestsException");
              done();
            });
          });
        } else {
          it("username should NOT be rate limited (username)", function(done) {
            helpers.get_avatar(rid, id, false, 160, function(err, status, image) {
              assert.strictEqual(err, null);
              done();
            });
          });
        }
      });
    })(id, id_type);
  }
});