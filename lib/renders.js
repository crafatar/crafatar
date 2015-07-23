// Skin locations are based on the work of Confuser, with 1.8 updates by Jake0oo0
// https://github.com/confuser/serverless-mc-skin-viewer
// Permission to use & distribute https://github.com/confuser/serverless-mc-skin-viewer/blob/master/LICENSE

var logging = require("./logging");
var fs = require("fs");
var Canvas = require("canvas");
var Image = Canvas.Image;
var exp = {};

// draws the helmet on to the +skin+
// using the skin from the +ctx+ at the +scale+
exp.draw_helmet = function(skin, ctx, scale) {
  // Helmet - Front
  ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 40, 8, 8, 8, 10 * scale, 13 / 1.2 * scale, 8 * scale, 8 * scale);
  // Helmet - Right
  ctx.setTransform(1, 0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 32, 8, 8, 8, 2 * scale, 3 / 1.2 * scale, 8 * scale, 8 * scale);
  // Helmet - Top
  ctx.setTransform(-1, 0.5, 1, 0.5, 0, 0);
  ctx.drawImage(skin, 48, 0, -8, 8, -5 * scale, 5 * scale, 8 * scale, 8 * scale);
};

// draws the head on to the +skin+
// using the skin from the +ctx+ at the +scale+
exp.draw_head = function(skin, ctx, scale) {
  // Head - Front
  ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 8, 8, 8, 8, 10 * scale, 13 / 1.2 * scale, 8 * scale, 8 * scale);
  // Head - Right
  ctx.setTransform(1, 0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 0, 8, 8, 8, 2 * scale, 3 / 1.2 * scale, 8 * scale, 8 * scale);
  // Head - Top
  ctx.setTransform(-1, 0.5, 1, 0.5, 0, 0);
  ctx.drawImage(skin, 16, 0, -8, 8, -5 * scale, 5 * scale, 8 * scale, 8 * scale);
};

// draws the body on to the +skin+
// using the skin from the +ctx+ at the +scale+
// parts are labeled as if drawn from the skin's POV
exp.draw_body = function(rid, skin, ctx, scale) {
  // Right Leg
  // Right Leg - Right
  ctx.setTransform(1, 0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 0, 20, 4, 12, 4 * scale, 26.4 / 1.2 * scale, 4 * scale, 12 * scale);
  // Right Leg - Front
  ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 4, 20, 4, 12, 8 * scale, 34.4 / 1.2 * scale, 4 * scale, 12 * scale);

  // Body
  // Body - Front
  ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 20, 20, 8, 12, 8 * scale, 20 / 1.2 * scale, 8 * scale, 12 * scale);

  // Arm Right
  // Arm Right - Right
  ctx.setTransform(1, 0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 40, 20, 4, 12, 0, 16 / 1.2 * scale, 4 * scale, 12 * scale);
  // Arm Right - Front
  ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
  ctx.drawImage(skin, 44, 20, 4, 12, 4 * scale, 20 / 1.2 * scale, 4 * scale, 12 * scale);
  // Arm Right - Top
  ctx.setTransform(-1, 0.5, 1, 0.5, 0, 0);
  ctx.drawImage(skin, 48, 16, -4, 4, 12 * scale, 16 * scale, 4 * scale, 4 * scale);

  if (skin.height === 32) {
    logging.debug(rid, "uses old skin format");
    // Left Leg
    // Left Leg - Front
    ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
    ctx.drawImage(skin, 8, 20, -4, 12, 12 * scale, 34.4 / 1.2 * scale, 4 * scale, 12 * scale);

    // Arm Left
    // Arm Left - Front
    ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
    ctx.drawImage(skin, 48, 20, -4, 12, 16 * scale, 20 / 1.2 * scale, 4 * scale, 12 * scale);
    // Arm Left - Top
    ctx.setTransform(-1, 0.5, 1, 0.5, 0, 0);
    ctx.drawImage(skin, 44, 16, 4, 4, 0, 16 * scale, 4 * scale, 4 * scale);
  } else {
    logging.debug(rid, "uses new skin format");
    // Left Leg
    // Left Leg - Front
    ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
    ctx.drawImage(skin, 20, 52, 4, 12, 12 * scale, 34.4 / 1.2 * scale, 4 * scale, 12 * scale);

    // Arm Left
    // Arm Left - Front
    ctx.setTransform(1, -0.5, 0, 1.2, 0, 0);
    ctx.drawImage(skin, 36, 52, 4, 12, 16 * scale, 20 / 1.2 * scale, 4 * scale, 12 * scale);
    // Arm Left - Top
    ctx.setTransform(-1, 0.5, 1, 0.5, 0, 0);
    ctx.drawImage(skin, 36, 48, 4, 4, 0, 16 * scale, 4 * scale, 4 * scale);
  }
};

// sets up the necessary components to draw the skin model
// uses the +img+ skin with options of drawing
// the +helm+ and the +body+
// callback: error, image buffer
exp.draw_model = function(rid, img, scale, helm, body, callback) {
  var skin = new Image();

  skin.onerror = function(err) {
    logging.error(rid, "render error:", err.stack);
    callback(err, null);
  };

  skin.onload = function() {
    var canvas = new Canvas(20 * scale, (body ? 44.8 : 17.6) * scale);
    var ctx = canvas.getContext("2d");

    ctx.patternQuality = "fast";
    if (body) {
      exp.draw_body(rid, skin, ctx, scale);
    }
    exp.draw_head(skin, ctx, scale);
    if (helm) {
      exp.draw_helmet(skin, ctx, scale);
    }

    canvas.toBuffer(function(err, buf) {
      if (err) {
        logging.error(rid, "error creating buffer:", err);
      }
      callback(err, buf);
    });
  };

  skin.src = img;
};

// helper method to open a render from +renderpath+
// callback: error, image buffer
exp.open_render = function(rid, renderpath, callback) {
  fs.readFile(renderpath, function(err, buf) {
    if (err) {
      logging.error(rid, "error while opening skin file:", err);
    }
    callback(err, buf);
  });
};


module.exports = exp;