var xhr = new XMLHttpRequest();

xhr.onload = function() {
  var response = JSON.parse(xhr.responseText);
  var status = {};
  response.map(function(elem) {
    var key = Object.keys(elem)[0];
    status[key] = elem[key];
  });

  var textures = status["textures.minecraft.net"] !== "green";
  var session = status["sessionserver.mojang.com"] !== "green";
  var skins = status["skins.minecraft.net"] !== "green";
  var error = null;

  if (textures || session && skins) {
    error = "both";
  } else if (skins) {
    error = "name";
  } else if (session) {
    error = "uuid";
  }

  console.log(error);
};

xhr.open("GET", "https://status.mojang.com/check", true);
xhr.send();