function knmi_setup() {
  function hour(date) {
    let hour = date.getUTCHours();
    return (hour < 10 ? "0" : "") + hour;
  }
  function day(date) {
    let day = date.getUTCDate();
    return (day < 10 ? "0" : "") + day;
  }
  function month(date) {
    let month = date.getUTCMonth();
    return (month < 10 ? "0" : "") + month;
  }

  var knmi = document.getElementById("knmi");
  var img_animation = document.getElementById("animation");


  var interval,
    frameids = [],
    loaded = true,
    paused = true;

  let d = new Date();
  d.setUTCMinutes(0);
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);
  if (d.getUTCHours() >= 14) {
    d.setUTCHours(12);
  } else if (d.getUTCHours() >= 2) {
    d.setUTCHours(0);
  } else {
    d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCHours(12);
  }

  frameids.push("AL" + day(d) + hour(d) + "_large.gif");

  let offset = 0;
  for (let i = 0; i < 2; i++) {
    offset += 12;
    if (d.getUTCHours() == 0) {
      d.setUTCHours(12);
    } else if (d.getUTCHours() == 12) {
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(0);
    } else {
      throw "wrong format for hours";
    }
    frameids.push("PL" + day(d) + hour(d) + "_large.gif");
  }

  var index = frameids.length - 1;

  function nextframe() {
    if (loaded) {
      if (index == frameids.length - 1) {
        index = 0;
      } else {
        index += 1;
      }

      loaded = false;
      img_animation.src = knmi_baseurl + frameids[index];
    }
    if (img_animation.complete) {
      loaded = true;
    }
  }

  img_animation.addEventListener("load", () => {
    loaded = true;
  });
  nextframe(); //show first frame

  knmi.addEventListener("click", () => {
    if (paused) interval = setInterval(nextframe, 1500);
    else clearInterval(interval);

    paused = !paused;
  });
}

window.addEventListener("load", function () {
  let asyncIframes = document.getElementsByClassName("asyncIframe");
  Array.from(asyncIframes).map((item) => {
    item.src = item.getAttribute("data-src");
  });
});
