var valid_user_id = /^[0-9a-f-A-F-]{32,36}$/; // uuid
var xhr = new XMLHttpRequest();

var quotes = [
  ["Crafatar is the best at what it does.", "Shotbow Network", "https://twitter.com/ShotbowNetwork/status/565201303555829762"],
  ["Crafatar seems to stand out from others", "Dabsunter", "https://github.com/crafatar/crafatar/wiki/What-people-say-about-Crafatar"],
  ["I can’t tell you how much Crafatar helped me along the way! You guys do some amazing work.", "Luke Chatton", "https://github.com/lukechatton"],
  ["It's just awesome! Keep up the good work", "Dannyps", "https://forums.spongepowered.org/t/title-cant-be-empty/4964/22"],
  ["It's one of the few services that actually does HTTP header caching correctly", "confuser", "https://github.com/BanManagement/BanManager-WebUI/issues/16#issuecomment-73230674"],
  ["It's so beautiful. &lt;3", "FerusGrim", "https://twitter.com/FerusGrim/status/642824817683656704"],
  ["Love it! It's great!", "Reddit User", "https://reddit.com/comments/2nth0j/-/cmh5771"],
  ["Such a useful service!", "Tim Z, NameMC", "https://twitter.com/CoderTimZ/status/602682146793349120"],
  ["Thanks for providing us with such a reliable service :)", "BeanBlockz", "https://twitter.com/BeanBlockz/status/743927789422845952"],
  ["This is excellent for my website! Good work.", "cyanide43", "https://reddit.com/comments/2nth0j/-/cmgpq85"],
  ["This is really cool!", "AlexWebber", "https://forums.spongepowered.org/t/crafatar-a-new-minecraft-avatar-service/4964/19"],
  ["This really is looking amazing. Absolutely love it!", "Enter_", "https://forums.spongepowered.org/t/crafatar-a-new-minecraft-avatar-service/4964/21"],
  ["We couldn't believe how flawless your API is, Good job!", "SenceServers", "https://twitter.com/SenceServers/status/697132506626265089"],
  ["WOW, Crafatar is FAST", "Rileriscool", "https://twitter.com/rileriscool/status/562057234986065921"],
  ["You deserve way more popularity", "McSlushie", "https://github.com/crafatar/crafatar/wiki/Credit/a8f37373531b1d2c2cb3557ba809542a2ed81626"],
  ["You do excellent work on Crafatar and are awesome! A very polished, concise & clean project.", "DrCorporate", "https://reddit.com/comments/2r1ns6/-/cnbq5f1"]
];
// shuffle quotes
for (i = quotes.length -1; i > 0; i--) {
  var a = Math.floor(Math.random() * i);
  var b = quotes[i];
  quotes[i] = quotes[a];
  quotes[a] = b;
}

var current_quote = 0;

function changeQuote() {
  var elem = document.querySelector("#quote");
  var quote = quotes[current_quote];
  elem.innerHTML = "<b>“" + quote[0] + "”</b><br>― <i>" + quote[1] + "</i>";
  elem.href = quote[2];
  current_quote = (current_quote + 1) % quotes.length;
}

xhr.onload = function() {
  var response = JSON.parse(xhr.responseText);

  var textures_err = response.report.skins.status !== "up";
  var session_err  = response.report.session.status !== "up";

  if (textures_err || session_err) {
    var warn = document.createElement("div");
    warn.setAttribute("class", "alert alert-warning");
    warn.setAttribute("role", "alert");
    warn.innerHTML = "<h5>Mojang issues</h5> Mojang's servers are having trouble <i>right now</i>, this may affect requests at Crafatar. <small><a href=\"https://mc-heads.net/mcstatus\" target=\"_blank\">check status</a>";
    document.querySelector("#alerts").appendChild(warn);
  }
};

document.addEventListener("DOMContentLoaded", function(event) {
  var avatars = document.querySelector("#avatar-wrapper");
  // shuffle avatars
  for (var i = 0; i < avatars.children.length; i++) {
    avatars.appendChild(avatars.children[Math.random() * i | 0]);
  }

  setInterval(changeQuote, 5000);
  changeQuote();

  var tryit = document.querySelector("#tryit");
  var tryname = document.querySelector("#tryname");
  var images = document.querySelectorAll(".tryit");
  tryit.onsubmit = function(e) {
    e.preventDefault();
    tryname.value = tryname.value.trim();
    var value = tryname.value || "853c80ef3c3749fdaa49938b674adae6";
    if (!valid_user_id.test(value)) {
      tryname.value = "";
      return;
    }
    for (var j = 0; j < images.length; j++) {
      images[j].src = images[j].dataset.src.replace("$", value);
    }
  };

  xhr.open("GET", "https://mc-heads.net/json/mc_status", true);
  xhr.send();
});
