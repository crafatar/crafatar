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
    error = "all";
  } else if (skins) {
    error = "username";
  } else if (session) {
    error = "UUID";
  }

  if (error) {
    var warn = document.createElement("div");
    warn.setAttribute("class", "alert alert-warning");
    warn.setAttribute("role", "alert");
    warn.innerHTML = "<h5>Mojang issues</h5> Mojang's servers are having trouble <i>right now</i>, this may affect <b>" + error + "</b> requests at Crafatar. <small><a href=\"https://help.mojang.com\" target=\"_blank\">check status</a>";
    document.querySelector("#alerts").appendChild(warn);
  }
};

document.addEventListener("DOMContentLoaded", function(event) {
  var avatars = document.querySelector("#avatar-wrapper");
  for (var i = 0; i < avatars.children.length; i++) {
    // shake 'em on down!
    // https://stackoverflow.com/a/11972692/2517068
    avatars.appendChild(avatars.children[Math.random() * i | 0]);
  }

  xhr.open("GET", "https://status.mojang.com/check", true);
  xhr.send();
});