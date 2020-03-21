/* globals describe, it, before, after */
/* eslint no-loop-func:0 guard-for-in:0 */

// no spam
var logging = require("../lib/logging");
if (process.env.VERBOSE_TEST !== "true" && process.env.TRAVIS !== "true") {
  logging.log = logging.debug = logging.warn = logging.error = function() {};
}

var networking = require("../lib/networking");
var helpers = require("../lib/helpers");
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

var uuids = fs.readFileSync("test/uuids.txt").toString().split(/\r?\n/);

// Get a random UUIDto prevent rate limiting
var uuid = uuids[Math.round(Math.random() * (uuids.length - 1))];


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

describe("Crafatar", function() {
  // we might have to make 2 HTTP requests
  this.timeout(config.server.http_timeout * 2 + 50);

  before(function(done) {
    console.log("Flushing and waiting for redis ...");
    cache.get_redis().flushall(function() {
      console.log("Redis flushed!");
      // cause I don't know how big hard drives are these days
      config.cleaner.disk_limit = Infinity;
      config.cleaner.redis_limit = Infinity;
      cleaner.run();
      done();
    });
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
    it("username is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("__niceUs3rname__"), false);
      done();
    });
    it("username alex is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("alex"), false);
      done();
    });
    it("username mhf_alex is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("mhf_alex"), false);
      done();
    });
    it("username steve is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("steve"), false);
      done();
    });
    it("username mhf_steve is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("mhf_steve"), false);
      done();
    });
    it(">16 length username is invalid", function(done) {
      assert.strictEqual(helpers.id_valid("ThisNameIsTooLong"), false);
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
  });
  describe("Avatar", function() {
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
        assert.notStrictEqual(["ETIMEDOUT", "ESOCKETTIMEDOUT"].indexOf(err.code), -1);
        config.server.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on skin download", function(done) {
      var original_timeout = config.http_timeout;
      config.server.http_timeout = 1;
      networking.get_from(rid(), "http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", function(body, res, error) {
        assert.notStrictEqual(["ETIMEDOUT", "ESOCKETTIMEDOUT"].indexOf(error.code), -1);
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
      assert.equal(res.headers["cache-control"], "max-age=" + config.caching.browser);
    }

    // throws Exception when +url+ is requested with +etag+
    // and it does not return 304 without a body
    function assert_cache(url, etag, callback) {
      request.get(url, {
        headers: {
          "If-None-Match": etag,
        },
      }, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(body, '');
        assert.equal(res.statusCode, 304);
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
      var url = "http://localhost:3000/%61%76%61%74%61%72%73/%61%65%37%39%35%61%61%38%36%33%32%37%34%30%38%65%39%32%61%62%32%35%63%38%61%35%39%66%33%62%61%31"; // avatars/ae795aa86327408e92ab25c8a59f3ba1
      request.get(url, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 201);
        assert_headers(res);
        assert(res.headers.etag);
        assert.strictEqual(res.headers["content-type"], "image/png");
        assert(body);
        done();
      });
    });

    it("should not fail on simultaneous requests", function(done) {
      var url = "http://localhost:3000/avatars/696a82ce41f44b51aa31b8709b8686f0";
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
          assert.strictEqual(res.statusCode === 201 || res.statusCode === 200, true);
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
  });

    var server_tests = {
      "avatar with existing uuid": {
        url: "http://localhost:3000/avatars/853c80ef3c3749fdaa49938b674adae6?size=16",
        crc32: [3337292777],
      },
      "avatar with non-existent uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16",
        crc32: [2416827277, 1243826040],
      },
      "avatar with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=mhf_alex",
        crc32: [862751081, 809395677],
      },
      "avatar with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16",
      },
      "avatar with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "overlay avatar with existing uuid": {
        url: "http://localhost:3000/avatars/853c80ef3c3749fdaa49938b674adae6?size=16&overlay",
        crc32: [1710265722],
      },
      "overlay avatar with non-existent uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay",
        crc32: [2416827277, 1243826040],
      },
      "overlay avatar with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay&default=mhf_alex",
        crc32: [862751081, 809395677],
      },
      "overlay avatar with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/avatars/853c80ef3c3749fdaa49938b674adae6?size=16",
      },
      "overlay avatar with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/avatars/00000000000000000000000000000000?size=16&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "cape with existing uuid": {
        url: "http://localhost:3000/capes/853c80ef3c3749fdaa49938b674adae6",
        crc32: [2556702429],
      },
      "cape with non-existent uuid": {
        url: "http://localhost:3000/capes/00000000000000000000000000000000",
        crc32: [0],
      },
      "cape with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/capes/00000000000000000000000000000000?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "skin with existing uuid": {
        url: "http://localhost:3000/skins/853c80ef3c3749fdaa49938b674adae6",
        crc32: [26500336],
      },
      "skin with non-existent uuid": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000",
        crc32: [981937087],
      },
      "skin with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?default=mhf_alex",
        crc32: [2298915739],
      },
      "skin with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?size=16&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/skins/853c80ef3c3749fdaa49938b674adae6?size=16",
      },
      "skin with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/skins/00000000000000000000000000000000?default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "head render with existing uuid": {
        url: "http://localhost:3000/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2",
        crc32: [1168786201],
      },
      "head render with non-existent uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2",
        crc32: [3800926063],
      },
      "head render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=mhf_alex",
        crc32: [4027858557],
      },
      "head render with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2",
      },
      "head render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "overlay head render with existing uuid": {
        url: "http://localhost:3000/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay",
        crc32: [2880579826],
      },
      "overlay head render with non-existent uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay",
        crc32: [3800926063],
      },
      "overlay head render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=mhf_alex",
        crc32: [4027858557],
      },
      "overlay head with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/renders/head/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay=",
      },
      "overlay head render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/head/00000000000000000000000000000000?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "body render with existing uuid": {
        url: "http://localhost:3000/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2",
        crc32: [2745192436],
      },
      "body render with non-existent uuid": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2",
        crc32: [996962526],
      },
      "body render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&default=mhf_alex",
        crc32: [1255106465],
      },
      "body render with non-existent uuid defaulting to uuid": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&default=853c80ef3c3749fdaa49938b674adae6",
        crc32: [0],
        redirect: "/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2",
      },
      "body render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
      },
      "overlay body render with existing uuid": {
        url: "http://localhost:3000/renders/body/853c80ef3c3749fdaa49938b674adae6?scale=2&overlay",
        crc32: [2441671793],
      },
      "overlay body render with non-existent uuid": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay",
        crc32: [996962526],
      },
      "overlay body render with non-existent uuid defaulting to mhf_alex": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay&default=mhf_alex",
        crc32: [1255106465],
      },
      "overlay body render with non-existent uuid defaulting to url": {
        url: "http://localhost:3000/renders/body/00000000000000000000000000000000?scale=2&overlay&default=http%3A%2F%2Fexample.com%2FCaseSensitive",
        crc32: [0],
        redirect: "http://example.com/CaseSensitive",
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
            var hash = crc(body);
            var matches = false;
            for (var c = 0; c < location.crc32.length; c++) {
              if (location.crc32[c] === hash) {
                matches = true;
                break;
              }
            }
            try {
              assert(matches);
            } catch(e) {
              throw new Error(hash + " != " + location.crc32 + " | " + body.toString("base64"));
            }
            assert.strictEqual(res.headers.location, location.redirect);
            if (location.crc32[0] === 0) {
              assert.strictEqual(res.statusCode, location.redirect ? 307 : 404);
              assert.ifError(res.headers.etag); // etag must not be present on non-200
              assert.strictEqual(res.headers["content-type"], "text/plain");
              done();
            } else {
              assert.strictEqual(res.headers["content-type"], "image/png");
              assert.strictEqual(res.statusCode, res.headers["x-storage-type"] === "downloaded" ? 201 : 200);
              assert(res.headers.etag);
              assert.strictEqual(res.headers.etag, '"' + hash + '"');
              assert_cache(location.url, res.headers.etag, function() {
                done();
              });
            }
          });
        });
      }(loc));
    }

    it("should return 304 on server error", function(done) {
      var original_debug = config.server.debug_enabled;
      var original_timeout = config.server.http_timeout;
      config.server.debug_enabled = false;
      config.server.http_timeout = 1;
      request.get({url: "http://localhost:3000/avatars/0000000000000000000000000000000f", headers: {"If-None-Match": '"some-etag"'}}, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(body, '');
        assert.strictEqual(res.statusCode, 304);
        config.server.debug_enabled = original_debug;
        config.server.http_timeout = original_timeout;
        done();
      });
    });

    it("should return a 422 (invalid size)", function(done) {
      var size = config.avatars.max_size + 1;
      request.get("http://localhost:3000/avatars/2d5aa9cdaeb049189930461fc9b91cc5?size=" + size, function(error, res, body) {
        assert.ifError(error);
        assert.strictEqual(res.statusCode, 422);
        done();
      });
    });

    it("should return a 422 (invalid scale)", function(done) {
      var scale = config.renders.max_scale + 1;
      request.get("http://localhost:3000/renders/head/2d5aa9cdaeb049189930461fc9b91cc5?scale=" + scale, function(error, res, body) {
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

    // testing all paths for Invalid UUID
    var locations = ["avatars", "skins", "capes", "renders/body", "renders/head"];
    for (var l in locations) {
      loc = locations[l];
      (function(location) {
        it("should return a 422 (invalid uuid " + location + ")", function(done) {
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
  });

  // we have to make sure that we test both a 32x64 and 64x64 skin
  describe("Networking: Render", function() {
    it("should not fail (uuid, 32x64 skin)", function(done) {
      helpers.get_render(rid(), "af74a02d19cb445bb07f6866a861f783", 6, true, true, function(err, hash, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not fail (uuid, 64x64 skin)", function(done) {
      helpers.get_render(rid(), "2d5aa9cdaeb049189930461fc9b91cc5", 6, true, true, function(err, hash, img) {
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



  describe("Networking: Avatar", function() {
    before(function() {
      cache.get_redis().flushall();
    });
    it("should be downloaded", function(done) {
      helpers.get_avatar(rid(), uuid, false, 160, function(err, status, image) {
        assert.ifError(err);
        assert.strictEqual(status, 2);
        done();
      });
    });
    it("should be cached", function(done) {
      helpers.get_avatar(rid(), uuid, false, 160, function(err, status, image) {
        assert.ifError(err);
        assert.strictEqual(status === 0 || status === 1, true);
        done();
      });
    });
  });

  describe("Networking: Skin", function() {
    it("should not fail (uuid)", function(done) {
      helpers.get_skin(rid(), uuid, function(err, hash, status, img) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe("Networking: Render", function() {
    it("should not fail (full body)", function(done) {
      helpers.get_render(rid(), uuid, 6, true, true, function(err, hash, img) {
        assert.ifError(err);
        done();
      });
    });
    it("should not fail (only head)", function(done) {
      helpers.get_render(rid(), uuid, 6, true, false, function(err, hash, img) {
        assert.ifError(err);
        done();
      });
    });
  });

  describe("Networking: Cape", function() {
    it("should not fail (possible cape)", function(done) {
      helpers.get_cape(rid(), uuid, function(err, hash, status, img) {
        assert.ifError(err);
        done();
      });
    });
  });


  describe("Errors", function() {
      before(function() {
      cache.get_redis().flushall();
    });

    it("uuid SHOULD be rate limited", function(done) {
      networking.get_profile(rid(), uuid, function() {
        networking.get_profile(rid(), uuid, function(err, profile) {
          assert.strictEqual(err.toString(), "HTTP: 429");
          assert.strictEqual(profile, null);
          done();
        });
      });
    });
  });

  after(function(done) {
    server.close(function() {
      cache.get_redis().quit();
      done();
    });
  });
});