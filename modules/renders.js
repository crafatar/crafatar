// Skin locations are based on the work of Confuser
// https://github.com/confuser/serverless-mc-skin-viewer
// Permission to use & distribute https://github.com/confuser/serverless-mc-skin-viewer/blob/master/LICENSE

var helpers = require('./helpers');
var logging = require('./logging');

var exp = {};

var Canvas = require('canvas');
var Image = Canvas.Image;

exp.draw_helmet = function(skin_canvas, model_ctx, scale) {
	//Helmet - Front
	model_ctx.setTransform(1,-0.5,0,1.2,0,0);
	model_ctx.drawImage(skin_canvas, 40*scale, 8*scale, 8*scale, 8*scale, 10*scale, 13/1.2*scale, 8*scale, 8*scale);
	//Helmet - Right
	model_ctx.setTransform(1,0.5,0,1.2,0,0);
	model_ctx.drawImage(skin_canvas, 32*scale, 8*scale, 8*scale, 8*scale, 2*scale, 3/1.2*scale, 8*scale, 8*scale);
	//Helmet - Top
	model_ctx.setTransform(-1,0.5,1,0.5,0,0);
	model_ctx.scale(-1,1);
	model_ctx.drawImage(skin_canvas, 40*scale, 0, 8*scale, 8*scale, -3*scale, 5*scale, 8*scale, 8*scale);
}

exp.draw_head = function(skin_canvas, model_ctx, scale) {
  //Head - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 8*scale, 8*scale, 8*scale, 8*scale, 10*scale, 13/1.2*scale, 8*scale, 8*scale);
  //Head - Right
  model_ctx.setTransform(1,0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 0, 8*scale, 8*scale, 8*scale, 2*scale, 3/1.2*scale, 8*scale, 8*scale);
  //Head - Top
  model_ctx.setTransform(-1,0.5,1,0.5,0,0);
  model_ctx.scale(-1,1);
  model_ctx.drawImage(skin_canvas, 8*scale, 0, 8*scale, 8*scale, -3*scale, 5*scale, 8*scale, 8*scale);
}

exp.draw_body = function(skin_canvas, model_ctx, scale) {
  //Left Leg
  //Left Leg - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.scale(-1,1);
  model_ctx.drawImage(skin_canvas, 4*scale, 20*scale, 4*scale, 12*scale, -16*scale, 34.4/1.2*scale, 4*scale, 12*scale);
  
  //Right Leg
  //Right Leg - Right
  model_ctx.setTransform(1,0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 0*scale, 20*scale, 4*scale, 12*scale, 4*scale, 26.4/1.2*scale, 4*scale, 12*scale);
  //Right Leg - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 4*scale, 20*scale, 4*scale, 12*scale, 8*scale, 34.4/1.2*scale, 4*scale, 12*scale);
  
  //Arm Left
  //Arm Left - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.scale(-1,1);
  model_ctx.drawImage(skin_canvas, 44*scale, 20*scale, 4*scale, 12*scale, -20*scale, 20/1.2*scale, 4*scale, 12*scale);
  //Arm Left - Top
  model_ctx.setTransform(-1,0.5,1,0.5,0,0);
  model_ctx.drawImage(skin_canvas, 44*scale, 16*scale, 4*scale, 4*scale, 0, 16*scale, 4*scale, 4*scale);
  
  //Body
  //Body - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 20*scale, 20*scale, 8*scale, 12*scale, 8*scale, 20/1.2*scale, 8*scale, 12*scale);
  
  //Arm Right
  //Arm Right - Right
  model_ctx.setTransform(1,0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 40*scale, 20*scale, 4*scale, 12*scale, 0, 16/1.2*scale, 4*scale, 12*scale);
  //Arm Right - Front
  model_ctx.setTransform(1,-0.5,0,1.2,0,0);
  model_ctx.drawImage(skin_canvas, 44*scale, 20*scale, 4*scale, 12*scale, 4*scale, 20/1.2*scale, 4*scale, 12*scale);
  //Arm Right - Top
  model_ctx.setTransform(-1,0.5,1,0.5,0,0);
  model_ctx.scale(-1,1);
  model_ctx.drawImage(skin_canvas, 44*scale, 16*scale, 4*scale, 4*scale, -16*scale, 16*scale, 4*scale, 4*scale);
}

exp.draw_model = function(uuid, img, scale, helm, body, callback) {
  var image = new Image;
  var width = 64 * scale;
  var height = 64 * scale;
  var model_canvas = new Canvas(20 * scale, (body ? 44.8 : 17.6) * scale);
  var skin_canvas = new Canvas(width, height);
  var model_ctx = model_canvas.getContext('2d');
  var skin_ctx = skin_canvas.getContext('2d');

  image.onerror = function(err) {
    logging.error("render error: " + err);
    callback(err, null);
  };

  image.onload = function() {
    skin_ctx.drawImage(image,0,0,64,64,0,0,64,64);
    //Scale it
    scale_image(skin_ctx.getImageData(0,0,64,64), skin_ctx, 0, 0, scale);
    if (body) {
      logging.log("drawing body");
      exp.draw_body(skin_canvas, model_ctx, scale);
    }
    logging.log("drawing head");
    exp.draw_head(skin_canvas, model_ctx, scale);
    if (helm) {
      logging.log("drawing helmet");
      exp.draw_helmet(skin_canvas, model_ctx, scale);
    }

    model_canvas.toBuffer(function(err, buf){
      if (err) {
        logging.log("error creating buffer: " + err);
      }
      callback(err, buf);
    });
  };

  image.src = img;
}

function scale_image(imageData, context, d_x, d_y, scale) {
  var width = imageData.width;
  var height = imageData.height;
  context.clearRect(0,0,width,height); //Clear the spot where it originated from
  for(y=0; y<height; y++) { //height original
    for(x=0; x<width; x++) { //width original
      //Gets original colour, then makes a scaled square of the same colour
      var index = (x + y * width) * 4;
      context.fillStyle = "rgba(" + imageData.data[index+0] + "," + imageData.data[index+1] + "," + imageData.data[index+2] + "," + imageData.data[index+3] + ")";
      context.fillRect(d_x + x*scale, d_y + y*scale, scale, scale);
    }
  }
}

module.exports = exp;
