/* globals describe, it, before, after */
/* eslint no-loop-func:0 guard-for-in:0 */
var networking = require("../lib/networking");
var helpers = require("../lib/helpers");
var logging = require("../lib/logging");
var cleaner = require("../lib/cleaner");
var request = require("request");
var config = require("../config");
var server = require("../lib/server");
var assert = require("assert");
var skins = require("../lib/skins");
var cache = require("../lib/cache");
var crc = require("crc").crc32;
var fs = require("fs");

// we don't want tests to fail because of slow internet
config.server.http_timeout *= 3;

// no spam
if (process.env.VERBOSE_TEST !== "true") {
  logging.log = logging.debug = logging.warn = logging.error = function() {};
}

var uuids = fs.readFileSync("test/uuids.txt").toString().split(/\r?\n/);
var names = fs.readFileSync("test/usernames.txt").toString().split(/\r?\n/);

// Get a random UUID + name in order to prevent rate limiting
var uuid = uuids[Math.round(Math.random() * (uuids.length - 1))];
var name = names[Math.round(Math.random() * (names.length - 1))];


// Let's hope these will never be assigned
var steve_ids = [
  "fffffff0" + "fffffff0" + "fffffff0" + "fffffff0",
  "fffffff0" + "fffffff0" + "fffffff1" + "fffffff1",
  "fffffff0" + "fffffff1" + "fffffff0" + "fffffff1",
  "fffffff0" + "fffffff1" + "fffffff1" + "fffffff0",
  "fffffff1" + "fffffff0" + "fffffff0" + "fffffff1",
  "fffffff1" + "fffffff0" + "fffffff1" + "fffffff0",
  "fffffff1" + "fffffff1" + "fffffff0" + "fffffff0",
  "fffffff1" + "fffffff1" + "fffffff1" + "fffffff1",
];
// Let's hope these will never be assigned
var alex_ids = [
  "fffffff0" + "fffffff0" + "fffffff0" + "fffffff1",
  "fffffff0" + "fffffff0" + "fffffff1" + "fffffff0",
  "fffffff0" + "fffffff1" + "fffffff0" + "fffffff0",
  "fffffff0" + "fffffff1" + "fffffff1" + "fffffff1",
  "fffffff1" + "fffffff0" + "fffffff0" + "fffffff0",
  "fffffff1" + "fffffff0" + "fffffff1" + "fffffff1",
  "fffffff1" + "fffffff1" + "fffffff0" + "fffffff1",
  "fffffff1" + "fffffff1" + "fffffff1" + "fffffff0",
];

// generates a 12 character random string
function rid() {
  return Math.random().toString(36).substring(2, 14);
}

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
  this.timeout(config.server.http_timeout * 2 + 50);

  before(function() {
    cache.get_redis().flushall();
    // cause I don't know how big hard drives are these days
    config.cleaner.disk_limit = Infinity;
    config.cleaner.redis_limit = Infinity;
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
      networking.get_profile(rid(), Array(33).join(number), function(err, profile) {
        assert.ifError(err);
        assert.strictEqual(profile, null);
        done();
      });
    });
    it("should not exist (username)", function(done) {
      networking.get_username_url(rid(), "Steve", 0, function(err, profile) {
        assert.ifError(err);
        done();
      });
    });
  });
  describe("Avatar", function() {
    it("uuid's account should exist, but skin should not", function(done) {
      // profile "Alex" - hoping it'll never have a skin
      networking.get_profile(rid(), "ec561538f3fd461daff5086b22154bce", function(err, profile) {
        assert.ifError(err);
        assert.notStrictEqual(profile, null);
        networking.get_uuid_info(profile, "CAPE", function(url) {
          assert.strictEqual(url, null);
          done();
        });
      });
    });
    it("Username should default to MHF_Steve", function(done) {
      assert.strictEqual(skins.default_skin("TestUser"), "mhf_steve");
      done();
    });
    for (var a in alex_ids) {
      var alexid = alex_ids[a];
      (function(alex_id) {
        it("UUID " + alex_id + " should default to MHF_Alex", function(done) {
          assert.strictEqual(skins.default_skin(alex_id), "mhf_alex");
          done();
        });
      }(alexid));
    }
    for (var s in steve_ids) {
      var steveid = steve_ids[s];
      (function(steve_id) {
        it("UUID " + steve_id + " should default to MHF_Steve", function(done) {
          assert.strictEqual(skins.default_skin(steve_id), "mhf_steve");
          done();
        });
      }(steveid));
    }
  });
  describe("Errors", function() {
    it("should time out on uuid info download", function(done) {
      var original_timeout = config.server.http_timeout;
      config.server.http_timeout = 1;
      networking.get_profile(rid(), "069a79f444e94726a5befca90e38aaf5", function(err, profile) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.server.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on username info download", function(done) {
      var original_timeout = config.server.http_timeout;
      config.server.http_timeout = 1;
      networking.get_username_url(rid(), "jomo", 0, function(err, url) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.server.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on skin download", function(done) {
      var original_timeout = config.http_timeout;
      config.server.http_timeout = 1;
      networking.get_from(rid(), "http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", function(body, res, error) {
        assert.strictEqual(error.code, "ETIMEDOUT");
        config.server.http_timeout = original_timeout;
        done();
      });
    });
    it("should not find the skin", function(done) {
      assert.doesNotThrow(function() {
        networking.get_from(rid(), "http://textures.minecraft.net/texture/this-does-not-exist", function(img, response, err) {
          assert.strictEqual(err, null); // no error here, but it shouldn't throw exceptions
          done();
        });
      });
    });
    it("should not find the file", function(done) {
      skins.open_skin(rid(), "non/existent/path", function(err, img) {
        assert(err);
        done();
      });
    });
  });

  describe("Server", function() {
    // throws Exception when default headers are not in res.headers
    function assert_headers(res) {
      assert(res.headers["content-type"]);
      assert("" + res.headers["response-time"]);
      assert(res.headers["x-request-id"]);
      assert.equal(res.headers["access-control-allow-origin"], "*");
      assert.equal(res.headers["cache-control"], "max-age=" + config.caching.browser + ", public");
    }

    // throws Exception when +url+ is requested with +etag+
    // and it does not return 304 without a body
    function assert_cache(url, etag, callback) {
      request.get(url, {
        headers: {
          "If-None-Match": etag
        }
      }, function(error, res, body) {
        assert.ifError(error);
        assert.ifError(body);
        assert.equal(res.statusCode, 304);
        assert(res.headers.etag);
        assert_headers(res);
        callback();
      });
    }

    before(function(done) {
      server.boot(function() {
        done();
      });
    });

    it("should return 405 Method Not Allowed for POST", function(done) {
      request.post("http://localhost:3000", function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 405);
        done();
      });
    });

    it("should return correct HTTP response for home page", function(done) {
      var url = "http://localhost:3000";
      request.get(url, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 200);
        assert_headers(res);
        assert(res.headers.etag);
        assert.strictEqual(res.headers["content-type"], "text/html; charset=utf-8");
        assert.strictEqual(res.headers.etag, '"' + crc(body) + '"');
        assert(body);

        assert_cache(url, res.headers.etag, function() {
          done();
        });
      });
    });

    it("should return correct HTTP response for assets", function(done) {
      var url = "http://localhost:3000/stylesheets/style.css";
      request.get(url, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 200);
        assert_headers(res);
        assert(res.headers.etag);
        assert.strictEqual(res.headers["content-type"], "text/css");
        assert.strictEqual(res.headers.etag, '"' + crc(body) + '"');
        assert(body);

        assert_cache(url, res.headers.etag, function() {
          done();
        });
      });
    });

    it("should return correct HTTP response for URL encoded URLs", function(done) {
      var url = "http://localhost:3000/%61%76%61%74%61%72%73/%6a%6f%6d%6f"; // avatars/jomo
      request.get(url, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 200);
        assert_headers(res);
        assert(res.headers.etag);
        assert.strictEqual(res.headers["content-type"], "image/png");
        assert(body);
        done();
      });
    });

    it("should not fail on simultaneous requests", function(done) {
      // do not change "constructor" !
      // it's a reserved property name, we're testing for that
      var sids = ["696a82ce41f44b51aa31b8709b8686f0", "constructor"];

      for (var j in sids) {
        var id = sids[j];
        var url = "http://localhost:3000/avatars/" + id;
        // 10 requests at once
        var requests = 10;
        var finished = 0;
        function partDone() {
          finished++;
          if (requests === finished) {
            done();
          }
        }
        function req() {
          request.get(url, function(error, res, body) {
            assert.ifError(error);
            assert.strictEqual(res.statusCode, 200);
            assert_headers(res);
            assert(res.headers.etag);
            assert.strictEqual(res.headers["content-type"], "image/png");
            assert(body);
            partDone();
          });
        }
        // make simultanous requests
        for (var k = 0; k < requests; k++) {
          req(k);
        }
      }
    });

    var server_tests = {
      "avatar with existing username": {
        url: "http://localhost:3000/avatars/jeb_?size=16",
        etag: '"a846b82963"',
        crc32: 1623808067
      },
      "avatar with non-existent username": {
        url: "http://localhost:3000/avatars/0?size=16",
        etag: '"mhf_steve"',
        crc32: [2416827277, 1243826040]
      },
      "avatar with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/0?size=16&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [862751081, 809395677]
      },
      "avatar with non-existent username defaulting to username": {
        url: "http://localhost:3000/avatars/0?size=16&default=jeb_",
        crc32: 0,
        redirect: "/avatars/jeb_?size=16"
      },
      "avatar with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/avatars/0?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16"
      },
      "avatar with non-existent username defaulting to url": {
        url: "http://localhost:3000/avatars/0?size=16&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay avatar with existing username": {
        url: "http://localhost:3000/avatars/jeb_?size=16&overlay",
        etag: '"a846b82963"',
        crc32: 646871998
      },
      "overlay avatar with non-existent username": {
        url: "http://localhost:3000/avatars/0?size=16&overlay",
        etag: '"mhf_steve"',
        crc32: [2416827277, 1243826040]
      },
      "overlay avatar with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/0?size=16&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [862751081, 809395677]
      },
      "overlay avatar with non-existent username defaulting to username": {
        url: "http://localhost:3000/avatars/0?size=16&overlay&default=jeb_",
        crc32: 0,
        redirect: "/avatars/jeb_?size=16&overlay="
      },
      "overlay avatar with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/avatars/0?size=16&overlay&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16&overlay="
      },
      "overlay avatar with non-existent username defaulting to url": {
        url: "http://localhost:3000/avatars/0?size=16&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "avatar with existing uuid": {
        url: "http://localhost:3000/avatars/853c80ef3c3749fdaa49938b674adae6?size=16",
        etag: '"a846b82963"',
        crc32: 1623808067
      },
      "avatar with non-existent uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16",
        etag: '"mhf_steve"',
        crc32: [2416827277, 1243826040]
      },
      "avatar with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [862751081, 809395677]
      },
      "avatar with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=jeb_",
        crc32: 0,
        redirect: "/avatars/jeb_?size=16"
      },
      "avatar with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16"
      },
      "avatar with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay avatar with existing uuid": {
        url: "http://localhost:3000/avatars/853c80ef3c3749fdaa49938b674adae6?size=16&overlay",
        etag: '"a846b82963"',
        crc32: 646871998
      },
      "overlay avatar with non-existent uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay",
        etag: '"mhf_steve"',
        crc32: [2416827277, 1243826040]
      },
      "overlay avatar with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [862751081, 809395677]
      },
      "overlay avatar with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=jeb_",
        crc32: 0,
        redirect: "/avatars/jeb_?size=16"
      },
      "overlay avatar with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16"
      },
      "overlay avatar with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "cape with existing username": {
        url: "http://localhost:3000/capes/jeb_",
        etag: '"3f688e0e69"',
        crc32: [989800403, 1901140141]
      },
      "cape with non-existent username": {
        url: "http://localhost:3000/capes/0",
        crc32: 0
      },
      "cape with non-existent username defaulting to url": {
        url: "http://localhost:3000/capes/0?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "cape with existing uuid": {
        url: "http://localhost:3000/capes/853c80ef3c3749fdaa49938b674adae6",
        etag: '"3f688e0e69"',
        crc32: [989800403, 1901140141]
      },
      "cape with non-existent uuid": {
        url: "http://localhost:3000/capes/00000000000000000000000000000000",
        crc32: 0
      },
      "cape with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/capes/00000000000000000000000000000000?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "skin with existing username": {
        url: "http://localhost:3000/skins/jeb_",
        etag: '"a846b82963"',
        crc32: 26500336
      },
      "skin with non-existent username": {
        url: "http://localhost:3000/skins/0",
        etag: '"mhf_steve"',
        crc32: 981937087
      },
      "skin with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/skins/0?default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: 2298915739
      },
      "skin with non-existent username defaulting to username": {
        url: "http://localhost:3000/skins/0?size=16&default=jeb_",
        crc32: 0,
        redirect: "/skins/jeb_?size=16"
      },
      "skin with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/skins/0?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/skins/853c80ef3c3749fdaa49938b674adae6?size=16"
      },
      "skin with non-existent username defaulting to url": {
        url: "http://localhost:3000/skins/0?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "skin with existing uuid": {
        url: "http://localhost:3000/skins/853c80ef3c3749fdaa49938b674adae6",
        etag: '"a846b82963"',
        crc32: 26500336
      },
      "skin with non-existent uuid": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000",
        etag: '"mhf_steve"',
        crc32: 981937087
      },
      "skin with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: 2298915739
      },
      "skin with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?size=16&default=jeb_",
        crc32: 0,
        redirect: "/skins/jeb_?size=16"
      },
      "skin with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/skins/853c80ef3c3749fdaa49938b674adae6?size=16"
      },
      "skin with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "head render with existing username": {
        url: "http://localhost:3000/renders/head/jeb_?scale=2",
        etag: '"a846b82963"',
        crc32: [3487896679, 3001090792]
      },
      "head render with non-existent username": {
        url: "http://localhost:3000/renders/head/0?scale=2",
        etag: '"mhf_steve"',
        crc32: [3257141069, 214248305]
      },
      "head render with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/0?scale=2&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [263450586, 3116770561]
      },
      "head render with non-existent username defaulting to username": {
        url: "http://localhost:3000/avatars/0?scale=2&default=jeb_",
        crc32: 0,
        redirect: "/avatars/jeb_?scale=2"
      },
      "head render with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/avatars/0?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?scale=2"
      },
      "head render with non-existent username defaulting to url": {
        url: "http://localhost:3000/renders/head/0?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay head render with existing username": {
        url: "http://localhost:3000/renders/head/jeb_?scale=2&overlay",
        etag: '"a846b82963"',
        crc32: [762377383, 1726474987]
      },
      "overlay head render with non-existent username": {
        url: "http://localhost:3000/renders/head/0?scale=2&overlay",
        etag: '"mhf_steve"',
        crc32: [3257141069, 214248305]
      },
      "overlay head render with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/0?scale=2&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [263450586, 3116770561]
      },
      "overlay head render with non-existent username defaulting to username": {
        url: "http://localhost:3000/renders/head/0?scale=2&overlay&default=jeb_",
        crc32: 0,
        redirect: "/renders/head/jeb_?scale=2&overlay="
      },
      "overlay head render with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/renders/head/0?scale=2&overlay&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay="
      },
      "overlay head render with non-existent username defaulting to url": {
        url: "http://localhost:3000/renders/head/0?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "head render with existing uuid": {
        url: "http://localhost:3000/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2",
        etag: '"a846b82963"',
        crc32: [3487896679, 3001090792]
      },
      "head render with non-existent uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2",
        etag: '"mhf_steve"',
        crc32: [3257141069, 214248305]
      },
      "head render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [263450586, 3116770561]
      },
      "head render with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=jeb_",
        crc32: 0,
        redirect: "/renders/head/jeb_?scale=2"
      },
      "head render with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2"
      },
      "head render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay head render with existing uuid": {
        url: "http://localhost:3000/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay",
        etag: '"a846b82963"',
        crc32: [762377383, 1726474987]
      },
      "overlay head render with non-existent uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay",
        etag: '"mhf_steve"',
        crc32: [3257141069, 214248305]
      },
      "overlay head render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [263450586, 3116770561]
      },
      "overlay head with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=jeb_",
        crc32: 0,
        redirect: "/renders/head/jeb_?scale=2&overlay="
      },
      "overlay head with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay="
      },
      "overlay head render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "body render with existing username": {
        url: "http://localhost:3000/renders/body/jeb_?scale=2",
        etag: '"a846b82963"',
        crc32: [3127075871, 2595192206]
      },
      "body render with non-existent username": {
        url: "http://localhost:3000/renders/body/0?scale=2",
        etag: '"mhf_steve"',
        crc32: [1046655221, 1620063267]
      },
      "body render with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [549240598, 3952648540]
      },
      "body render with non-existent username defaulting to username": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=jeb_",
        crc32: 0,
        redirect: "/renders/body/jeb_?scale=2"
      },
      "body render with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2"
      },
      "body render with non-existent username defaulting to url": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay body render with existing username": {
        url: "http://localhost:3000/renders/body/jeb_?scale=2&overlay",
        etag: '"a846b82963"',
        crc32: [699892097, 2732138694]
      },
      "overlay body render with non-existent username": {
        url: "http://localhost:3000/renders/body/0?scale=2&overlay",
        etag: '"mhf_steve"',
        crc32: [1046655221, 1620063267]
      },
      "overlay body render with non-existent username defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/0?scale=2&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [549240598, 3952648540]
      },
      "overlay body render with non-existent username defaulting to username": {
        url: "http://localhost:3000/renders/body/0?scale=2&overlay&default=jeb_",
        crc32: 0,
        redirect: "/renders/body/jeb_?scale=2&overlay="
      },
      "overlay body render with non-existent username defaulting to uuid": {
        url: "http://localhost:3000/renders/body/0?scale=2&overlay&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay="
      },
      "overlay body render with non-existent username defaulting to url": {
        url: "http://localhost:3000/renders/body/0?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "body render with existing uuid": {
        url: "http://localhost:3000/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2",
        etag: '"a846b82963"',
        crc32: [3127075871, 2595192206]
      },
      "body render with non-existent uuid": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2",
        etag: '"mhf_steve"',
        crc32: [1046655221, 1620063267]
      },
      "body render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [549240598, 3952648540]
      },
      "body render with non-existent uuid defaulting to username": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=jeb_",
        crc32: 0,
        redirect: "/renders/body/jeb_?scale=2"
      },
      "body render with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/body/0?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: 0,
        redirect: "/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2"
      },
      "body render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
      "overlay body render with existing uuid": {
        url: "http://localhost:3000/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay",
        etag: '"a846b82963"',
        crc32: [699892097, 2732138694]
      },
      "overlay body render with non-existent uuid": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay",
        etag: '"mhf_steve"',
        crc32: [1046655221, 1620063267]
      },
      "overlay body render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay&default=mhf_alex",
        etag: '"mhf_alex"',
        crc32: [549240598, 3952648540]
      },
      "overlay body render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: 0,
        redirect: "http://example.com/CaseSensitive"
      },
    };

    for (var description in server_tests) {
      var loc = server_tests[description];
      (function(location) {
        it("should return correct HTTP response for " + description, function(done) {
          request.get(location.url, {followRedirect: false, encoding: null}, function(error, res, body) {
            assert.ifError(error);
            assert_headers(res);
            assert(res.headers["x-storage-type"]);
            assert.strictEqual(res.headers.etag, location.etag);
            var matches = false;
            if (location.crc32 instanceof Array) {
              for (var i = 0; i < location.crc32.length; i++) {
                if (location.crc32[i] === crc(body)) {
                  matches = true;
                  break;
                }
              }
            } else {
              matches = location.crc32 === crc(body);
            }
            try {
              assert.ok(matches);
            } catch(e) {
              throw new Error(crc(body) + " != " + location.crc32 + " | " + body.toString("base64"));
            }
            assert.strictEqual(res.headers.location, location.redirect);
            if (location.etag === undefined) {
              assert.strictEqual(res.statusCode, location.redirect ? 307 : 404);
              assert.strictEqual(res.headers["content-type"], "text/plain");
              done();
            } else {
              assert(res.headers.etag);
              assert.strictEqual(res.headers["content-type"], "image/png");
              assert.strictEqual(res.statusCode, 200);
              assert_cache(location.url, res.headers.etag, function() {
                done();
              });
            }
          });
        });
      }(loc));
    }

    it("should return a 422 (invalid size)", function(done) {
      var size = config.avatars.max_size + 1;
      request.get("http://localhost:3000/avatars/Jake_0?size=" + size, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 422);
        done();
      });
    });

    it("should return a 422 (invalid scale)", function(done) {
      var scale = config.renders.max_scale + 1;
      request.get("http://localhost:3000/renders/head/Jake_0?scale=" + scale, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 422);
        done();
      });
    });

    it("should return a 422 (invalid render type)", function(done) {
      request.get("http://localhost:3000/renders/invalid/Jake_0", function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 422);
        done();
      });
    });

    // testing all paths for Invalid UserID
    var locations = ["avatars", "skins", "capes", "renders/body", "renders/head"];
    for (var l in locations) {
      loc = locations[l];
      (function(location) {
        it("should return a 422 (invalid id " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/thisisaninvaliduuid", function(error, res, body) {
            assert.ifError(error);
            assert.strictEqual(res.statusCode, 422);
            done();
          });
        });

        it("should return a 404 (invalid path " + location + ")", function(done) {
          request.get("http://localhost:3000/" + location + "/853c80ef3c3749fdaa49938b674adae6/invalid", function(error, res, body) {
            assert.ifError(error);
            assert.strictEqual(res.statusCode, 404);
            done();
          });
        });
      }(loc));
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
      helpers.get_render(rid(), "md_5", 6, true, true, function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not fail (username, 64x64 skin)", function(done) {
      helpers.get_render(rid(), "Jake_0", 6, true, true, function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe("Networking: Cape", function() {
    it("should not fail (guaranteed cape)", function(done) {
      helpers.get_cape(rid(), "Dinnerbone", function(err, hash, status, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should already exist", function(done) {
      before(function() {
        cache.get_redis().flushall();
      });
      helpers.get_cape(rid(), "Dinnerbone", function(err, hash, status, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not be found", function(done) {
      helpers.get_cape(rid(), "Jake_0", function(err, hash, status, img) {
        assert.ifError(err);
        assert.strictEqual(img, null);
        done();
      });
    });
  });

  describe("Networking: Skin", function() {
    it("should not fail", function(done) {
      helpers.get_cape(rid(), "Jake_0", function(err, hash, status, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should already exist", function(done) {
      before(function() {
        cache.get_redis().flushall();
      });
      helpers.get_cape(rid(), "Jake_0", function(err, hash, status, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });


  // DRY with uuid and username tests
  for (var i in ids) {
    var iid = ids[i];
    var iid_type = iid.length > 16 ? "uuid" : "name";
    // needs an anonymous function because id and id_type aren't constant
    (function(id, id_type) {
      describe("Networking: Avatar", function() {
        before(function() {
          cache.get_redis().flushall();
          console.log("\n\nRunning tests with " + id_type + " '" + id + "'\n\n");
        });

        it("should be downloaded", function(done) {
          helpers.get_avatar(rid(), id, false, 160, function(err, status, image) {
            assert.ifError(err);
            assert.strictEqual(status, 2);
            done();
          });
        });
        it("should be cached", function(done) {
          helpers.get_avatar(rid(), id, false, 160, function(err, status, image) {
            assert.ifError(err);
            assert.strictEqual(status === 0 || status === 1, true);
            done();
          });
        });
        if (id.length > 16) {
          console.log("can't run 'checked' test due to Mojang's rate limits :(");
        } else {
          it("should be checked", function(done) {
            var original_cache_time = config.caching.local;
            config.caching.local = 0;
            helpers.get_avatar(rid(), id, false, 160, function(err, status, image) {
              assert.ifError(err);
              assert.strictEqual(status, 3);
              config.caching.local = original_cache_time;
              done();
            });
          });
        }
      });

      describe("Networking: Skin", function() {
        it("should not fail (uuid)", function(done) {
          helpers.get_skin(rid(), id, function(err, hash, status, img) {
            assert.strictEqual(err, null);
            done();
          });
        });
      });

      describe("Networking: Render", function() {
        it("should not fail (full body)", function(done) {
          helpers.get_render(rid(), id, 6, true, true, function(err, hash, img) {
            assert.ifError(err);
            done();
          });
        });
        it("should not fail (only head)", function(done) {
          helpers.get_render(rid(), id, 6, true, false, function(err, hash, img) {
            assert.ifError(err);
            done();
          });
        });
      });

      describe("Networking: Cape", function() {
        it("should not fail (possible cape)", function(done) {
          helpers.get_cape(rid(), id, function(err, hash, status, img) {
            assert.ifError(err);
            done();
          });
        });
      });


      describe("Errors", function() {
        before(function() {
          cache.get_redis().flushall();
        });

        if (id_type === "uuid") {
          it("uuid should be rate limited", function(done) {
            networking.get_profile(rid(), id, function() {
              networking.get_profile(rid(), id, function(err, profile) {
                assert.strictEqual(err.toString(), "HTTP: 429");
                assert.strictEqual(profile, null);
                done();
              });
            });
          });
        } else {
          it("username should NOT be rate limited (username)", function(done) {
            helpers.get_avatar(rid(), id, false, 160, function() {
              helpers.get_avatar(rid(), id, false, 160, function(err, status, image) {
                assert.strictEqual(err, null);
                done();
              });
            });
          });
        }
      });
    }(iid, iid_type));
  }
});