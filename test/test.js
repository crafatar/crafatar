var request = require('supertest');
var asset = require('assert');
var should = require('should');
var fs = require('fs')
var uuids = fs.readFileSync('uuids.txt').toString().split("\n");
// Get a random UUID in order to prevent rate limiting
var uuid = uuids[Math.floor((Math.random() * 200) + 1)]; 

// Only deletes files, doesn't delete directory.
var deleteFolderRecursive = function(path) {
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			var curPath = path + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
	}
};

describe('Avatar Serving', function(){
	before(function() {
		deleteFolderRecursive('../skins/');
	})
	describe('UUID', function(){
		it("should respond with a 422", function(done){
			request('http://localhost:3000')
			.get('/avatars/invaliduuid')
			.expect(422)
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(422);
				done();
			});
		});
		it("should respond with a 404", function(done){
			request('http://localhost:3000')
			.get('/avatars/2d5aa9cdaeb049189930461fc9b91dd5')
			.expect(404)
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(404);
				done();
			});
		});
		it("should be downloaded", function(done){
			request('http://localhost:3000')
			.get('/avatars/' + uuid)
			.expect(200)
			.expect('X-Storage-Type', "downloaded")
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(200);
				done();
			});
		});
		it("should respond with a valid avatar", function(done){
			request('http://localhost:3000')
			.get('/avatars/' + uuid)
			.expect(200)
			.expect('Content-Type', "image/png")
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(200);
				done();
			});
		});
		it("should should be locally saved", function(done){
			request('http://localhost:3000')
			.get('/avatars/' + uuid)
			.expect(200)
			.expect('X-Storage-Type', "local")
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(200);
				done();
			});
		});
		it("should should be rate limited", function(done){
			deleteFolderRecursive('../skins/');
			request('http://localhost:3000')
			.get('/avatars/' + uuid)
			.expect(404)
			.end(function(err,res) {
				if (err) throw err;
				res.statusCode.should.eql(404);
				done();
			});
		});
	});
});