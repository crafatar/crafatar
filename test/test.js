var assert = require('assert');
var fs = require('fs');

var networking = require('../modules/networking');
var helpers = require('../modules/helpers');
var config = require('../modules/config');
var skins = require('../modules/skins');
var cache = require("../modules/cache");

// we don't want tests to fail because of slow internet
config.http_timeout = 3000;

var uuids = fs.readFileSync('test/uuids.txt').toString().split("\n");
var usernames = fs.readFileSync('test/usernames.txt').toString().split("\n");
// Get a random UUID + username in order to prevent rate limiting
var uuid = uuids[Math.round(Math.random() * (uuids.length - 1))];
var username = usernames[Math.round(Math.random() * (usernames.length - 1))];

describe('UUID/username', function() {
  before(function() {
    cache.get_redis().flushall();
  });

  describe('UUID', function() {
    it("should be an invalid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid("g098cb60fa8e427cb299793cbd302c9a"), false);
      done();
    });
    it("should be an invalid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid(""), false);
      done();
    });
    it("should be an invalid uuid", function(done) {
      assert.strictEqual(helpers.uuid_valid("0098cb60-fa8e-427c-b299-793cbd302c9a"), false);
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
    it("should be a valid username", function(done) {
      assert.strictEqual(helpers.uuid_valid("__niceUs3rname__"), true);
      done();
    });
    it("should not exist", function(done) {
      networking.get_profile("00000000000000000000000000000000", function(err, profile) {
        assert.strictEqual(err, 0);
        done();
      });
    });
  });

  describe('Avatar', function() {
    it("should be downloaded (uuid)", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(status, 2);
        done();
      });
    });
    it("should be local (uuid)", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(status, 1);
        done();
      });
    });
    it("should be downloaded (username)", function(done) {
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(status, 2);
        done();
      });
    });
    it("should be local (username)", function(done) {
      helpers.get_avatar(username, false, 160, function(err, status, image) {
        assert.strictEqual(status, 1);
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
  });

  describe('Mojang Errors', function() {
    before(function() {
      cache.get_redis().flushall();
    });
    it("should be rate limited", function(done) {
      helpers.get_avatar(uuid, false, 160, function(err, status, image) {
        assert.strictEqual(err, null);
        done();
      });
    });
    it("should time out on profile download", function(done) {
      config.http_timeout = 1;
      networking.get_profile("069a79f444e94726a5befca90e38aaf5", function(err, profile) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = 3000;
        done();
      });
    });
    it("should time out on skin download", function(done) {
      config.http_timeout = 1;
      networking.skin_file("http://textures.minecraft.net/texture/477be35554684c28bdeee4cf11c591d3c88afb77e0b98da893fd7bc318c65184", "face.png", "helm.png", function(err) {
        assert.strictEqual(err.code, "ETIMEDOUT");
        config.http_timeout = 3000;
        done();
      });
    });
  });
});
