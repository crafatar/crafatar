var valid_user_id = /^([0-9a-f-A-F-]{32,36}|[a-zA-Z0-9_]{1,16})$/; // uuid|username
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

  var tryit = document.querySelector("#tryit");
  var tryname = document.querySelector("#tryname");
  var images = document.querySelectorAll(".tryit");
  tryit.onsubmit = function(e) {
    e.preventDefault();
    tryname.value = tryname.value.trim();
    var value = tryname.value || "853c80ef3c3749fdaa49938b674adae6";
    if (!valid_user_id.test(value)) {
      return;
    }
    for (var j = 0; j < images.length; j++) {
      images[j].src = images[j].dataset.src.replace("$", value);
    }
  };

  xhr.open("GET", "https://status.mojang.com/check", true);
  xhr.send();
});