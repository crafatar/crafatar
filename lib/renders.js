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
    var arm_width = 4;

    var parts = {
      head: {
        front: getPart(skin, 8, 8, 8, 8, scale),
        right: getPart(skin, 0, 8, 8, 8, scale),
        top: getPart(skin, 8, 0, 8, 8, scale),
      },
      arm: {
        right: {
          front: getPart(skin, 44, 20, arm_width, 12, scale),
          side: getPart(skin, 40, 20, 4, 12, scale),
        },
        left: {
          front: null,
        },
      },
      leg: {
        right: {
          front: getPart(skin, 4, 20, 4, 12, scale),
          side: getPart(skin, 0, 20, 4, 12, scale),
        },
        left: {
          front: null,
        }
      },
      shoulder: {
        right: getPart(skin, 44, 16, arm_width, 4, scale),
        left: null,
      },
      body: getPart(skin, 20, 20, 8, 12, scale),
    };

    if (skin.height === 32) {
      // old skin
      parts.arm.left.front = flip(parts.arm.right.front);
      parts.leg.left.front = flip(parts.leg.right.front);
      parts.shoulder.left = flip(parts.shoulder.right);
    } else {
      // 1.8 skin - has separate left/right arms & legs
      parts.arm.left.front = getPart(skin, 36, 52, arm_width, 12, scale);
      parts.leg.left.front = getPart(skin, 20, 52, 4, 12, scale);
      parts.shoulder.left = getPart(skin, 36, 48, arm_width, 4, scale);
    }

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

      frontc.drawImage(parts.arm.right.front, (4 - arm_width) * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(parts.arm.left.front, 12 * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(parts.body, 4 * scale, 0 * scale, 8 * scale, 12 * scale);
      frontc.drawImage(parts.leg.right.front, 4 * scale, 12 * scale, 4 * scale, 12 * scale);
      frontc.drawImage(parts.leg.left.front, 8 * scale, 12 * scale, 4 * scale, 12 * scale);

      // top
      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
      ctx.drawImage(parts.shoulder.right, y - z - 0.5, x + z, parts.shoulder.right.width + 1, parts.shoulder.right.height + 1);

      y = scale * 8;
      ctx.drawImage(parts.shoulder.left, y - z, x + z, parts.shoulder.left.width, parts.shoulder.left.height + 1);

      // right side
      ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
      x = x_offset + scale * 2;
      y = 0;
      z = z_offset + scale * 20;
      ctx.drawImage(parts.leg.right.side, x + y, z - y, parts.leg.right.side.width, parts.leg.right.side.height);

      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.drawImage(parts.arm.right.side, x + y, z - y - 0.5, parts.arm.right.side.width, parts.arm.right.side.height + 1);

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
    ctx.drawImage(parts.head.top, y - z, x + z, parts.head.top.width, parts.head.top.height + 1);

    // head front
    x = x_offset + 8 * scale;
    y = 0;
    z = z_offset - 0.5;
    ctx.setTransform(1, -skew_a, 0, skew_b, 0, skew_a);
    ctx.drawImage(parts.head.front, y + x, x + z, parts.head.front.width, parts.head.front.height);

    // head right
    x = x_offset;
    y = 0;
    z = z_offset;
    ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
    ctx.drawImage(parts.head.right, x + y, z - y - 0.5, parts.head.right.width, parts.head.right.height + 1);

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