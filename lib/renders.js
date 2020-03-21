// Skin locations are based on the work of Confuser, with 1.8 updates by Jake0oo0
// https://github.com/confuser/serverless-mc-skin-viewer
// Permission to use & distribute https://github.com/confuser/serverless-mc-skin-viewer/blob/master/LICENSE

var logging = require("./logging");
var fs = require("fs");
var cvs = require("canvas");
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


// checks if the given +canvas+ has any pixel that is not fully opaque
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

// resize the +src+ canvas by +scale+
// returns a new canvas
function resize(src, scale) {
  var dst = cvs.createCanvas();
  dst.width = scale * src.width;
  dst.height = scale * src.height;
  var context = dst.getContext("2d");

  // don't blur on resize
  context.patternQuality = "fast";

  context.drawImage(src, 0, 0, src.width * scale, src.height * scale);
  return dst;
}

// get a rectangular part of the +src+ canvas
// the returned canvas is scaled by factor +scale+
function getPart(src, x, y, width, height, scale) {
  var dst = cvs.createCanvas();
  dst.width = scale * width;
  dst.height = scale * height;
  var context = dst.getContext("2d");

  // don't blur on resize
  context.patternQuality = "fast";

  context.drawImage(src, x, y, width, height, 0, 0, width * scale, height * scale);
  return dst;
}

// flip the +src+ canvas horizontally
function flip(src) {
  var dst = cvs.createCanvas();
  dst.width = src.width;
  dst.height = src.height;
  var context = dst.getContext("2d");
  context.scale(-1, 1);
  context.drawImage(src, -src.width, 0);
  return dst;
}

// skew for isometric perspective
var skew_a = 26 / 45;    // 0.57777777
var skew_b = skew_a * 2; // 1.15555555

// renders a player model with the given skin +img+ and +scale+
// +overlay+ - wether the extra skin layer is rendered
// +is_body+ - false for head only
// +slim+ - wether the player has a slim skin model
// callback: error, image buffer
exp.draw_model = function(rid, img, scale, overlay, is_body, slim, callback) {
  var canvas = cvs.createCanvas();
  canvas.width = scale * 20;
  canvas.height = scale * (is_body ? 45.1 : 18.5);

  var ctx = canvas.getContext("2d");
  cvs.loadImage(img).then((skin) => {
    var old_skin = skin.height === 32;
    var arm_width = slim ? 3 : 4;

    /* eslint-disable no-multi-spaces */
    var head_top        = resize(removeTransparency(getPart(skin, 8, 0, 8, 8, 1)), scale);
    var head_front      = resize(removeTransparency(getPart(skin, 8, 8, 8, 8, 1)), scale);
    var head_right      = resize(removeTransparency(getPart(skin, 0, 8, 8, 8, 1)), scale);

    var arm_right_top   = resize(removeTransparency(getPart(skin, 44, 16, arm_width, 4, 1)), scale);
    var arm_right_front = resize(removeTransparency(getPart(skin, 44, 20, arm_width, 12, 1)), scale);
    var arm_right_side  = resize(removeTransparency(getPart(skin, 40, 20, 4, 12, 1)), scale);

    var arm_left_top    = old_skin ? flip(arm_right_top)   : resize(removeTransparency(getPart(skin, 36, 48, arm_width, 4, 1)), scale);
    var arm_left_front  = old_skin ? flip(arm_right_front) : resize(removeTransparency(getPart(skin, 36, 52, arm_width, 12, 1)), scale);

    var leg_right_front = resize(removeTransparency(getPart(skin, 4, 20, 4, 12, 1)), scale);
    var leg_right_side  = resize(removeTransparency(getPart(skin, 0, 20, 4, 12, 1)), scale);

    var leg_left_front  = old_skin ? flip(leg_right_front) : resize(removeTransparency(getPart(skin, 20, 52, 4, 12, 1)), scale);

    var body_front      = resize(removeTransparency(getPart(skin, 20, 20, 8, 12, 1)), scale);
    /* eslint-enable no-multi-spaces */

    if (overlay) {
      if (hasTransparency(getPart(skin, 32, 0, 32, 32, 1))) {
        // render head overlay
        head_top.getContext("2d").drawImage(getPart(skin, 40, 0, 8, 8, scale), 0, 0);
        head_front.getContext("2d").drawImage(getPart(skin, 40, 8, 8, 8, scale), 0, 0);
        head_right.getContext("2d").drawImage(getPart(skin, 32, 8, 8, 8, scale), 0, 0);
      }

      if (!old_skin) {
        // See #117
        // if MC-89760 gets fixed, we can (probably) simply check the whole skin for transparency

        /* eslint-disable no-multi-spaces */
        var body_region      = getPart(skin, 16, 32, 32, 16, 1);
        var right_arm_region = getPart(skin, 48, 48, 16, 16, 1);
        var left_arm_region  = getPart(skin, 40, 32, 16, 16, 1);
        var right_leg_region = getPart(skin, 0, 32, 16, 16, 1);
        var left_leg_region  = getPart(skin, 0, 48, 16, 16, 1);
        /* eslint-enable no-multi-spaces */

        if (hasTransparency(body_region)) {
          // render body overlay
          body_front.getContext("2d").drawImage(getPart(skin, 20, 36, 8, 12, scale), 0, 0);
        }

        if (hasTransparency(right_arm_region)) {
          // render right arm overlay
          arm_right_top.getContext("2d").drawImage(getPart(skin, 44, 32, arm_width, 4, scale), 0, 0);
          arm_right_front.getContext("2d").drawImage(getPart(skin, 44, 36, arm_width, 12, scale), 0, 0);
          arm_right_side.getContext("2d").drawImage(getPart(skin, 40, 36, 4, 12, scale), 0, 0);
        }

        if (hasTransparency(left_arm_region)) {
          // render left arm overlay
          arm_left_top.getContext("2d").drawImage(getPart(skin, 36 + 16, 48, arm_width, 4, scale), 0, 0);
          arm_left_front.getContext("2d").drawImage(getPart(skin, 36 + 16, 52, arm_width, 12, scale), 0, 0);
        }

        if (hasTransparency(right_leg_region)) {
          // render right leg overlay
          leg_right_front.getContext("2d").drawImage(getPart(skin, 4, 36, 4, 12, scale), 0, 0);
          leg_right_side.getContext("2d").drawImage(getPart(skin, 0, 36, 4, 12, scale), 0, 0);
        }

        if (hasTransparency(left_leg_region)) {
          // render left leg overlay
          leg_left_front.getContext("2d").drawImage(getPart(skin, 4, 52, 4, 12, scale), 0, 0);
        }
      }
    }

    var x = 0;
    var y = 0;
    var z = 0;

    var z_offset = scale * 3;
    var x_offset = scale * 2;

    if (is_body) {
      // pre-render front onto separate canvas
      var front = cvs.createCanvas();
      front.width = scale * 16;
      front.height = scale * 24;
      var frontc = front.getContext("2d");
      frontc.patternQuality = "fast";

      frontc.drawImage(arm_right_front, (4 - arm_width) * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(arm_left_front, 12 * scale, 0 * scale, arm_width * scale, 12 * scale);
      frontc.drawImage(body_front, 4 * scale, 0 * scale, 8 * scale, 12 * scale);
      frontc.drawImage(leg_right_front, 4 * scale, 12 * scale, 4 * scale, 12 * scale);
      frontc.drawImage(leg_left_front, 8 * scale, 12 * scale, 4 * scale, 12 * scale);


      // top
      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.setTransform(1, -skew_a, 1, skew_a, 0, 0);
      ctx.drawImage(arm_right_top, y - z - 0.5, x + z, arm_right_top.width + 1, arm_right_top.height + 1);

      y = scale * 8;
      ctx.drawImage(arm_left_top, y - z, x + z, arm_left_top.width, arm_left_top.height + 1);

      // right side
      ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
      x = x_offset + scale * 2;
      y = 0;
      z = z_offset + scale * 20;
      ctx.drawImage(leg_right_side, x + y, z - y, leg_right_side.width, leg_right_side.height);

      x = x_offset + scale * 2;
      y = scale * -arm_width;
      z = z_offset + scale * 8;
      ctx.drawImage(arm_right_side, x + y, z - y - 0.5, arm_right_side.width, arm_right_side.height + 1);

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
    ctx.drawImage(head_front, y + x, x + z, head_front.width, head_front.height);

    // head right
    x = x_offset;
    y = 0;
    z = z_offset;
    ctx.setTransform(1, skew_a, 0, skew_b, 0, 0);
    ctx.drawImage(head_right, x + y, z - y - 0.5, head_right.width + 0.5, head_right.height + 1);

    canvas.toBuffer(function(err, buf) {
      if (err) {
        logging.error(rid, "error creating buffer:", err);
      }
      callback(err, buf);
    });
  });
};

// helper method to open a render from +renderpath+
// callback: error, image buffer
exp.open_render = function(rid, renderpath, callback) {
  fs.readFile(renderpath, callback);
};

module.exports = exp;