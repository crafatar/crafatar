var assert = require('assert');
var fs = require('fs');

var networking = require('../modules/networking');
var helpers = require('../modules/helpers');
var config = require('../modules/config');
var skins = require('../modules/skins');
var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL);
var redis = require("redis").createClient(redisURL.port, redisURL.hostname, {no_ready_check: true}).auth(redisURL.auth.split(":")[1]);

var uuids = fs.readFileSync('test/uuids.txt').toString().split("\r\n");
// Get a random UUID in order to prevent rate limiting
var uuid = uuids[Math.floor(Math.random() * uuids.length)];

describe('Avatar Serving', function(){
  before(function() {
    redis.flushall();
  });
  describe('UUID', function(){
    it("should be an invalid uuid", function(done){
      assert.equal(helpers.uuid_valid("invaliduuid"), false);
      done();
    });
    it("should be a valid uuid", function(done){
      assert.equal(helpers.uuid_valid("0098cb60fa8e427cb299793cbd302c9a"), true);
      done();
    });
  });
  describe('Avatar', function(){
    it("should be downloaded", function(done) {
      helpers.get_avatar(uuid, false, 180, function(err, status, image) {
        assert.equal(status, 2);
        done();
      });
    });
    it("should be local", function(done) {
      helpers.get_avatar(uuid, false, 180, function(err, status, image) {
        assert.equal(status, 1);
        done();
      });
    });
  });
  describe('Mojang Errors', function(){
    before(function() {
      redis.flushall();
    });
    it("should be rate limited", function(done) {
      helpers.get_avatar(uuid, false, 180, function(err, status, image) {
        assert.equal(err, null);
        done();
      });
    });
  });
});
