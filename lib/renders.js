// Skin locations are based on the work of Confuser, with 1.8 updates by Jake0oo0
// https://github.com/confuser/serverless-mc-skin-viewer
// Permission to use & distribute https://github.com/confuser/serverless-mc-skin-viewer/blob/master/LICENSE

var logging = require("./logging");
var fs = require("fs");
var Canvas = require("canvas");
var Image = Canvas.Image;
var exp = {};

// set alpha values to 255
function removeTransparency(canvas) {
  var ctx = canvas.getContext("2d");
  var imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var data = imagedata.data;
  // data is [r,g,b,a, r,g,b,a, *]
  for (var i = 0; i < data.length; i += 4) {
    // usually we would have to check for alpha = 0
    // and set color to black here
    // but node-canvas already does that for us

    // remove transparency
    data[i + 3] = 255;
  }
  ctx.putImageData(imagedata, 0, 0);
  return canvas;
}

function hasTransparency(canvas) {
  var ctx = canvas.getContext("2d");
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (var i = 3; i < imageData.length; i += 4) {
    if (imageData[i] < 255) {
      // found pixel with translucent alpha value
      return true;
    }
  }
  return false;
}

function resize(src, scale) {
  var dst = new Canvas();
  dst.width = scale * src.width;
  dst.height = scale * src.height;
  var context = dst.getContext("2d");

  // don't blur on resize
  context.patternQuality = "fast";

  context.drawImage(src, 0, 0, src.width * scale, src.height * scale);
  return dst;
}

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

exp.draw_model = function(rid, img, scale, overlay, is_body, callback) {
  var canvas = new Canvas();
  canvas.width = scale * 20;
  canvas.height = scale * (is_body ? 45.1 : 18.5);

  var ctx = canvas.getContext("2d");
  var skin = new Image();

  skin.onload = function() {
    var old_skin = skin.height === 32;
    var arm_width = 4;

    var parts = {
      head: {
        front: resize(removeTransparency(getPart(skin, 8, 8, 8, 8, 1)), scale),
        right: resize(removeTransparency(getPart(skin, 0, 8, 8, 8, 1)), scale),
        top: resize(removeTransparency(getPart(skin, 8, 0, 8, 8, 1)), scale),
      },
      arm: {
        right: {
          front: resize(removeTransparency(getPart(skin, 44, 20, arm_width, 12, 1)), scale),
          side: resize(removeTransparency(getPart(skin, 40, 20, 4, 12, 1)), scale),
        },
        left: {
          front: null,
        },
      },
      leg: {
        right: {
          front: resize(removeTransparency(getPart(skin, 4, 20, 4, 12, 1)), scale),
          side: resize(removeTransparency(getPart(skin, 0, 20, 4, 12, 1)), scale),
        },
        left: {
          front: null,
        }
      },
      shoulder: {
        right: resize(removeTransparency(getPart(skin, 44, 16, arm_width, 4, 1)), scale),
        left: null,
      },
      body: resize(removeTransparency(getPart(skin, 20, 20, 8, 12, 1)), scale),
    };
    var overlays = {
      head: {},
      arm: {right: {}, left: {}},
      leg: {right: {}, left: {}},
      shoulder: {},
      body: {},
    };

    // overlays
    var render_head = overlay && hasTransparency(getPart(skin, 32, 0, 32, 32, 1));
    var render_body;
    var render_rleg;
    var render_lleg;
    var render_larm;
    var render_rarm;

    // head overlay is shifted 32px right
    overlays.head.front = overlay && render_head && getPart(skin, 8 + 32, 8, 8, 8, scale);
    overlays.head.right = overlay && render_head && getPart(skin, 0 + 32, 8, 8, 8, scale);
    overlays.head.top = overlay && render_head && getPart(skin, 8 + 32, 0, 8, 8, scale);

    if ( old_skin) {
      parts.arm.left.front = flip(parts.arm.right.front);
      parts.leg.left.front = flip(parts.leg.right.front);
      parts.shoulder.left = flip(parts.shoulder.right);
    } else {
      // 1.8 skin - has separate left/right arms & legs
      parts.arm.left.front = resize(removeTransparency(getPart(skin, 36, 52, arm_width, 12, 1)), scale);
      parts.leg.left.front = resize(removeTransparency(getPart(skin, 20, 52, 4, 12, 1)), scale);
      parts.shoulder.left = resize(removeTransparency(getPart(skin, 36, 48, arm_width, 4, 1)), scale);

      // See #117
      // if MC-89760 gets fixed, we can (probably) simply check the whole skin for transparency
      render_body = overlay && hasTransparency(getPart(skin, 16, 32, 32, 16, 1));
      render_rleg = overlay && hasTransparency(getPart(skin, 0, 32, 16, 16, 1));
      render_lleg = overlay && hasTransparency(getPart(skin, 0, 48, 16, 16, 1));
      render_larm = overlay && hasTransparency(getPart(skin, 40, 32, 16, 16, 1));
      render_rarm = overlay && hasTransparency(getPart(skin, 48, 48, 16, 16, 1));

      // body overlay is shifted 16px down
      overlays.body.front = render_body && getPart(skin, 20, 20 + 16, 8, 12, scale);

      // right arm overlay is shifted 16px down
      overlays.arm.right.front = render_rarm && getPart(skin, 44, 20 + 16, arm_width, 12, scale);
      overlays.arm.right.side = render_rarm && getPart(skin, 40, 20 + 16, 4, 12, scale);
      overlays.shoulder.right = render_rarm && getPart(skin, 44, 16 + 16, arm_width, 4, scale);

      // left arm overlay is shifted 16px right
      overlays.arm.left.front = render_larm && getPart(skin, 36 + 16, 52, arm_width, 12, scale);
      overlays.shoulder.left = render_larm && getPart(skin, 36 + 16, 48, arm_width, 4, scale);

      // right leg overlay is shifted 16px down
      overlays.leg.right.front = render_rleg && getPart(skin, 4, 20 + 16, 4, 12, scale);
      overlays.leg.right.side = render_rleg && getPart(skin, 0, 20 + 16, 4, 12, scale);
      // left leg overlay is shifted 16px left
      overlays.leg.left.front = render_lleg && getPart(skin, 20 - 16, 52, 4, 12, scale);
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

      // front overlay
      var fronto = new Canvas();
      if (!old_skin) {
        // pre-render front overlay onto separate canvas
        fronto.width = scale * 16;
        fronto.height = scale * 24;
        var frontoc = fronto.getContext("2d");
        frontoc.patternQuality = "fast";

        if (render_rarm) {
          frontoc.drawImage(overlays.arm.right.front, (4 - arm_width) * scale, 0 * scale, arm_width * scale, 12 * scale + 1);
        }
        if (render_larm) {
          frontoc.drawImage(overlays.arm.left.front, 12 * scale, 0 * scale, arm_width * scale, 12 * scale + 1);
        }
        if (render_body) {
          frontoc.drawImage(overlays.body.front, 4 * scale, 0 * scale, 8 * scale, 12 * scale);
        }
        if (render_rleg) {
          frontoc.drawImage(overlays.leg.right.front, 4 * scale, 12 * scale, 4 * scale, 12 * scale);
        }
        if (render_lleg) {
          frontoc.drawImage(overlays.leg.left.front, 8 * scale, 12 * scale, 4 * scale, 12 * scale);
        }
      }


      // top
      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
      ctx.drawImage(parts.shoulder.right, y - z - 0.5, x + z, parts.shoulder.right.width + 1, parts.shoulder.right.height + 1);
      if (render_rarm) {
        x -= 1;
        ctx.drawImage(overlays.shoulder.right, y - z, x + z, overlays.shoulder.right.width + 2, overlays.shoulder.right.height + 2);
      }

      y = scale * 8;
      ctx.drawImage(parts.shoulder.left, y - z, x + z, parts.shoulder.left.width, parts.shoulder.left.height + 1);
      if (render_larm) {
        console.log(overlays.shoulder.left);
        z += 0.5;
        ctx.drawImage(overlays.shoulder.left, y - z, x + z, overlays.shoulder.left.width + 1, overlays.shoulder.left.height + 1);
      }

      // right side
      ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
      x = x_offset + scale * 2;
      y = 0;
      z = z_offset + scale * 20;
      ctx.drawImage(parts.leg.right.side, x + y, z - y, parts.leg.right.side.width, parts.leg.right.side.height);
      if (render_rleg) {
        ctx.drawImage(overlays.leg.right.side, x + y, z - y, overlays.leg.right.side.width, overlays.leg.right.side.height + 0.5);
      }

      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.drawImage(parts.arm.right.side, x + y, z - y - 0.5, parts.arm.right.side.width, parts.arm.right.side.height + 1);
      if (render_rarm) {
        z -= 1;
        ctx.drawImage(overlays.arm.right.side, x + y, z - y, overlays.arm.right.side.width, overlays.arm.right.side.height + 2);
      }

      // front
      z = z_offset + scale * 12;
      y = 0;
      ctx.setTransform(1, -skew_a, 0, skew_b, 0, skew_a);
      ctx.drawImage(front, y + x, x + z - 0.5, front.width, front.height);
      if (!old_skin) {
        ctx.drawImage(fronto, y + x, x + z - 1, fronto.width, fronto.height + 1);
      }
    }

    // head top
    x = x_offset;
    y = -0.5;
    z = z_offset;
    ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
    ctx.drawImage(parts.head.top, y - z, x + z, parts.head.top.width, parts.head.top.height + 1);
    if (render_head) {
      x -= 0.5;
      z -= 0.5;
      ctx.drawImage(overlays.head.top, y - z, x + z, overlays.head.top.width + 0.5, overlays.head.top.height + 1.5);
    }

    // head front
    x = x_offset + 8 * scale;
    y = 0;
    z = z_offset - 0.5;
    ctx.setTransform(1, -skew_a, 0, skew_b, 0, skew_a);
    ctx.drawImage(parts.head.front, y + x, x + z, parts.head.front.width, parts.head.front.height);
    if (render_head) {
      z -= 1;
      ctx.drawImage(overlays.head.front, y + x, x + z, overlays.head.front.width, overlays.head.front.height + 2);
    }

    // head right
    x = x_offset;
    y = 0;
    z = z_offset;
    ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
    ctx.drawImage(parts.head.right, x + y, z - y - 0.5, parts.head.right.width, parts.head.right.height + 1);
    if (render_head) {
      z -= 1;
      ctx.drawImage(overlays.head.right, x + y, z - y - 0.5, overlays.head.right.width, overlays.head.right.height + 3);
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