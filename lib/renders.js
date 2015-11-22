// Skin locations are based on the work of Confuser, with 1.8 updates by Jake0oo0
// https://github.com/confuser/serverless-mc-skin-viewer
// Permission to use & distribute https://github.com/confuser/serverless-mc-skin-viewer/blob/master/LICENSE

var logging = require("./logging");
var fs = require("fs");
var Canvas = require("canvas");
var Image = Canvas.Image;
var exp = {};

function getPart(src, x, y, width, height, scale) {
  var dst = new Canvas();
  dst.width = scale * width;
  dst.height = scale * height;
  var context = dst.getContext("2d");

  // don't blur on resize
  context.patternQuality = "fast";

  context.drawImage(src, x, y, width, height, 0, 0, width * scale, height * scale);
  return dst;
}

function flip(src) {
  var dst = new Canvas();
  dst.width = src.width;
  dst.height = src.height;
  var context = dst.getContext("2d");
  context.scale(-1, 1);
  context.drawImage(src, -src.width, 0);
  return dst;
}

var skew_a = 26 / 45;    // 0.57777777
var skew_b = skew_a * 2; // 1.15555555

exp.draw_model = function(rid, img, scale, helm, is_body, callback) {
  var canvas = new Canvas();
  canvas.width = scale * 20;
  canvas.height = scale * (is_body ? 45.1 : 18.5);

  var ctx = canvas.getContext("2d");

  var skin = new Image();

  skin.onload = function() {
    var old_type = skin.height === 32;
    var arm_width = 4;

    var face = getPart(skin, 8, 8, 8, 8, scale);
    var head_right = getPart(skin, 0, 8, 8, 8, scale);
    var head_top = getPart(skin, 8, 0, 8, 8, scale);
    var body = getPart(skin, 20, 20, 8, 12, scale);
    var right_arm = getPart(skin, 44, 20, arm_width, 12, scale);
    var right_arm_side = getPart(skin, 40, 20, arm_width, 12, scale);
    var left_arm = flip(right_arm); // TODO
    var right_leg = getPart(skin, 4, 20, 4, 12, scale);
    var right_leg_side = getPart(skin, 0, 20, 4, 12, scale);
    var left_leg = flip(right_leg); // TODO
    var right_shoulder = getPart(skin, 44, 16, 4, 4, scale);
    var left_shoulder = flip(right_shoulder); // TODO

    var x = 0;
    var y = 0;
    var z = 0;

    var z_offset = scale * 3;
    var x_offset = scale * 2;

    if (is_body) {
      // pre-render front onto separate canvas
      var front = new Canvas();
      front.width = scale * 16;
      front.height = scale * 24;
      var frontc = front.getContext("2d");
      frontc.patternQuality = "fast";

      frontc.drawImage(right_arm, (4 - arm_width) * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(left_arm, 12 * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(body, 4 * scale, 0 * scale, 8 * scale, 12 * scale);
      frontc.drawImage(right_leg, 4 * scale, 12 * scale, 4 * scale, 12 * scale);
      frontc.drawImage(left_leg, 8 * scale, 12 * scale, 4 * scale, 12 * scale);

      // top
      x = x_offset + scale * 2;
      y = scale * -4;
      z = z_offset + scale * 8;
      ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
      ctx.drawImage(right_shoulder, y - z - 0.5, x + z, right_shoulder.width + 1, right_shoulder.height + 1);

      y = scale * 8;
      ctx.drawImage(left_shoulder, y - z, x + z, 4 * scale, 4 * scale + 1);

      // right side
      ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
      x = x_offset + scale * 2;
      y = 0;
      z = z_offset + scale * 20;
      ctx.drawImage(right_leg_side, x + y, z - y, right_leg_side.width, right_leg_side.height);

      x = x_offset + scale * 2;
      y = scale * -4;
      z = z_offset + scale * 8;
      ctx.drawImage(right_arm_side, x + y, z - y - 0.5, right_arm_side.width, right_arm_side.height + 1);

      // front
      z = z_offset + scale * 12;
      y = 0;
      ctx.setTransform(1, -skew_a, 0, skew_b, 0, skew_a);
      ctx.drawImage(front, y + x, x + z - 0.5, front.width, front.height);
    }

    // head top
    x = x_offset;
    y = -0.5;
    z = z_offset;
    ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
    ctx.drawImage(head_top, y - z, x + z, head_top.width, head_top.height + 1);

    // head front
    x = x_offset + 8 * scale;
    y = 0;
    z = z_offset - 0.5;
    ctx.setTransform(1, -skew_a, 0, skew_b, 0, skew_a);
    ctx.drawImage(face, y + x, x + z, face.width, face.height);

    // head right
    x = x_offset;
    y = 0;
    z = z_offset;
    ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
    ctx.drawImage(head_right, x + y, z - y - 0.5, head_right.width, head_right.height + 1);

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