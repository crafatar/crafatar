var assert = require('assert');
var fs = require('fs');

var networking = require('../modules/networking');
var helpers = require('../modules/helpers');
var logging = require('../modules/logging');
var config = require('../modules/config');
var skins = require('../modules/skins');
var cache = require("../modules/cache");

// we don't want tests to fail because of slow internet
config.http_timeout *= 3;

// no spam
logging.log = function(){};

var uuids = fs.readFileSync('test/uuids.txt').toString().split("\r\n");
var usernames = fs.readFileSync('test/usernames.txt').toString().split("\r\n");
// Get a random UUID + username in order to prevent rate limiting
var uuid = uuids[Math.round(Math.random() * (uuids.length - 1))];
console.log("using uuid '" + uuid + "'");
var username = usernames[Math.round(Math.random() * (usernames.length - 1))];
console.log("using username '" + username + "'");

describe('Crafatar', function() {
  // we might have to make 2 HTTP requests
  this.timeout(config.http_timeout * 2 + 50);

  before(function() {
    cache.get_redis().flushall();
  });

  describe('UUID/username', function() {
    it("should be an invalid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid("g098cb60fa8e427cb299793cbd302c9a"), false);
      done();
    });
    it("should be an invalid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid(""), false);
      done();
    });
    it("should be an invalid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("usernäme"), false);
      done();
    });
    it("should be an invalid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("user-name"), false);
      done();
    });
    it("should be an invalid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("ThisNameIsTooLong"), false);
      done();
    });
    it("should be a valid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid("0098cb60fa8e427cb299793cbd302c9a"), true);
      done();
    });
    it("should be a valid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid("0098cb60-fa8e-427c-b299-793cbd302c9a"), true);
      done();
    });
    it("should be a valid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("__niceUs3rname__"), true);
      done();
    });
    it("should be a valid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("a"), true);
      done();
    });
    it("should not exist (uuid)", function(done) {
      networking.get_skin_url("00000000000000000000000000000000", function(err, profile) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should not exist (username)", function(done) {
      networking.get_skin_url("Steve", function(err, profile) {
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe('Networking: Avatar', function() {
    it("should be downloaded (uuid)", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(status, 2);
        done();
      });
    });
    it("should be cached (uuid)", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(status, 1);
        done();
      });
    });
    /* We can't test this because of mojang's rate limits :(
    it("should be checked (uuid)", function(done) {
      var original_cache_time = config.local_cache_time;
      config.local_cache_time = 0;
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(status, 3);
        config.local_cache_time = original_cache_time;
        done();
      });
    });
    */
    it("should be downloaded (username)", function(done) {
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(status, 2);
        done();
      });
    });
    it("should be cached (username)", function(done) {
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(status, 1);
        done();
      });
    });
    it("should be checked (username)", function(done) {
      var original_cache_time = config.local_cache_time;
      config.local_cache_time = 0;
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(status, 3);
        config.local_cache_time = original_cache_time;
        done();
      });
    });
    it("should not exist (but account does)", function(done) {
      // profile 'Alex'
      helpers.get_avatar("ec561538f3fd461daff5086b22154bce", false, 160, function(err, status, image) {
        assert.strictEqual(status, 3);
        done();
      });
    });
    it("should already have the files / not download", function(done) {

      // FIXME: implement & remove this line
      throw("Please re-implement this and add a new test");


      assert.doesNotThrow(function() {
        fs.openSync("face.png", "w");
        fs.openSync("helm.png", "w");
        networking.get_skin("http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", function(err, img) {
          assert.strictEqual(err, null); // no error here, but it shouldn't throw exceptions
          fs.unlinkSync("face.png");
          fs.unlinkSync("helm.png");
          done();
        });
      });
    });
    it("should default to Alex", function(done) {
      assert.strictEqual(skins.default_skin("ec561538f3fd461daff5086b22154bce"), "alex");
      done();
    });
    it("should default to Steve", function(done) {
      assert.strictEqual(skins.default_skin("b8ffc3d37dbf48278f69475f6690aabd"), "steve");
      done();
    });
  });

  describe('Errors', function() {
    before(function() {
      cache.get_redis().flushall();
    });
    it("should be rate limited (uuid)", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(JSON.parse(err).error, "TooManyRequestsException");
        done();
      });
    });
    it("should NOT be rate limited (username)", function(done) {
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should time out on uuid info download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_skin_url("069a79f444e94726a5befca90e38aaf5", function(err, skin_url) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on username info download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_skin_url("redstone_sheep", function(err, skin_url) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should time out on skin download", function(done) {
      var original_timeout = config.http_timeout;
      config.http_timeout = 1;
      networking.get_skin("http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", function(err, img) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = original_timeout;
        done();
      });
    });
    it("should not find the skin", function(done) {
      assert.doesNotThrow(function() {
        networking.get_skin("http://textures.minecraft.net/texture/this-does-not-exist", function(err, img) {
          assert.strictEqual(err, null); // no error here, but it shouldn't throw exceptions
          done();
        });
      });
    });
    it("should handle file updates on invalid files", function(done) {
      assert.doesNotThrow(function() {
        cache.update_timestamp("0123456789abcdef0123456789abcdef", "invalid-file.png");
      });
      done();
    });
  });

  after(function() {
    try {
      // these files could be here if a test failed
      fs.unlinkSync("face.png");
      fs.unlinkSync("helm.png");
    } catch(e){}
  });

});
