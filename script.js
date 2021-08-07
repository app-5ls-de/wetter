var main_div = document.getElementById("main");

var location_data;
fetch("/locations.json")
  .then((response) => {
    if (response.ok) {
      return Promise.resolve(response);
    } else {
      return Promise.reject(new Error(response.statusText));
    }
  })
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    let params = new URLSearchParams(window.location.search);
    let location_name = params.get("location");
    for (let i = 0; i < data.length; i++) {
      if (data[i].id == location_name) {
        location_data = data[i];
        document.getElementById("title-link").innerText = location_data.name;

        display_widgets();
        break;
      }
    }
    if (!location_data) {
      localStorage.removeItem("lastvisited");
      window.location.href = window.location.origin;
    }
  })
  .catch((error) => {
    console.log("Request failed", error);
  });

function display_widgets() {
  meteoblue();
  knmi();
  accuweather_link();
  windy_link();
  windy_map();
  windy_map("waves");
  dwd_warn();
  dwd_trend();
  meteoblue_simple();
  daswetter();
  windguru();
}

function meteoblue() {
  if (!(location_data.meteoblue_src && location_data.meteoblue_id)) return;

  let meteoblue_div = document.getElementById("meteoblue");
  meteoblue_div.classList.add("section");

  let meteoblue_img = document.createElement("img");
  meteoblue_img.src = location_data.meteoblue_src;
  if (debug)
    meteoblue_img.src = "https://via.placeholder.com/2220x1470?text=meteoblue";
  meteoblue_img.alt = "meteoblue";
  meteoblue_div.appendChild(meteoblue_img);

  let meteoblue_a = document.createElement("a");
  meteoblue_a.href =
    "https://www.meteoblue.com/de/wetter/woche/" + location_data.meteoblue_id;
  meteoblue_a.target = "_blank";
  meteoblue_a.innerText = "Wetter " + location_data.name + " - meteoblue";
  meteoblue_div.appendChild(meteoblue_a);

  let meteoblue_info_div = document.createElement("div");
  meteoblue_info_div.classList.add("info");
  meteoblue_info_div.innerHTML =
    '<a href="/meteoblue-hilfe"><img src="/info.svg" /></a>';
  meteoblue_div.appendChild(meteoblue_info_div);
}

function knmi() {
  let eu_states =
    "at,bg,be,hr,cy,cz,dk,ee,fi,fr,de,gb,gr,hu,ie,it,lv,lt,lu,mt,nl,po,pt,ro,sk,si,es,se".split(
      ","
    );
  if (location_data.country && !location_data.country in eu_states) return;

  let knmi_div = document.getElementById("knmi");
  knmi_div.classList.add("section");

  let knmi_animation_img = document.createElement("img");
  knmi_animation_img.id = "animation";
  knmi_animation_img.alt = "knmi";
  knmi_div.appendChild(knmi_animation_img);

  let knmi_info_div = document.createElement("div");
  knmi_info_div.classList.add("info");
  knmi_info_div.innerHTML = '<a href="/knmi-hilfe"><img src="/info.svg" /></a>';
  knmi_div.appendChild(knmi_info_div);

  var knmi_baseurl =
    "https://cdn.knmi.nl/knmi/map/page/weer/waarschuwingen_verwachtingen/weerkaarten/";
  if (debug) knmi_baseurl = "https://via.placeholder.com/800x653?text=knmi+";

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
      knmi_animation_img.src = knmi_baseurl + frameids[index];
    }
    if (knmi_animation_img.complete) {
      loaded = true;
    }
  }

  knmi_animation_img.addEventListener("load", () => {
    loaded = true;
  });
  nextframe(); //show first frame

  knmi_div.addEventListener("click", () => {
    if (paused) interval = setInterval(nextframe, 1500);
    else clearInterval(interval);

    paused = !paused;
  });
}

function accuweather_link() {
  if (!location_data.accuweather) return;

  let accuweather_div = document.getElementById("accuweather-link");
  accuweather_div.classList.add("accuweather-link");

  let accuweather_a = document.createElement("a");
  accuweather_a.href =
    "https://www.accuweather.com/de/" + location_data.accuweather;
  accuweather_a.target = "_blank";
  accuweather_a.innerText = "MinuteCast von Accuweather";
  accuweather_div.appendChild(accuweather_a);
}

function windy_link() {
  if (!(location_data.lat && location_data.lon)) return;

  let windy_div = document.getElementById("windy-link");
  windy_div.classList.add("windy-link");

  let windy_a = document.createElement("a");
  windy_a.href =
    "https://windy.com/" +
    location_data.lat +
    "/" +
    location_data.lon +
    "/meteogram?rain," +
    location_data.lat +
    "," +
    location_data.lon +
    ",7";
  windy_a.target = "_blank";
  windy_a.innerText = "Windy Meteogram (10 Tage)";
  windy_div.appendChild(windy_a);
}

function windy_map(overlay_type) {
  if (overlay_type == "waves" && !location_data.windy_waves) return;
  if (!(location_data.lat && location_data.lon)) return;

  let windy_map_div = document.getElementById("windy-map");
  if (overlay_type == "waves")
    windy_map_div = document.getElementById("windy-map-waves");
  windy_map_div.classList.add("windy-map");

  let windy_map_iframe;
  if (debug) {
    windy_map_iframe = document.createElement("img");
    windy_map_iframe.src = "https://via.placeholder.com/800?text=windy-map";
    windy_map_iframe.alt = "windy-map";
    if (overlay_type == "waves") {
      windy_map_iframe.src += "-waves";
      windy_map_iframe.alt += "-waves";
    }
    windy_map_iframe.style.width = "100%";
    windy_map_iframe.style.height = "100%";
  } else {
    windy_map_iframe = document.createElement("iframe");
    windy_map_div.classList.add("asyncIframe");
    windy_map_iframe.src =
      "https://embed.windy.com/embed2.html?lat=" +
      location_data.lat +
      "&lon=" +
      location_data.lon +
      "&zoom=7&level=surface&overlay=rain&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&detailLat=" +
      location_data.lat +
      "&detailLon=" +
      location_data.lon +
      "&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1";
    if (overlay_type == "waves") {
      windy_map_iframe.src =
        "https://embed.windy.com/embed2.html?lat=" +
        location_data.lat +
        "&lon=" +
        location_data.lon +
        "&zoom=10&level=surface&overlay=waves&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&detailLat=" +
        location_data.lat +
        "&detailLon=" +
        location_data.lon +
        "&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1";
    }
    windy_map_iframe.setAttribute("frameborder", "0");
    windy_map_iframe.setAttribute("importance", "low");
  }
  windy_map_div.appendChild(windy_map_iframe);

  let windy_map_info_div = document.createElement("div");
  windy_map_info_div.classList.add("info");
  windy_map_info_div.innerHTML =
    '<a href="https://community.windy.com/topic/3361/description-of-weather-overlays"><img src="/info.svg"></a>\n' +
    '<a href="https://community.windy.com/topic/12/what-source-of-weather-data-windy-use"><img src="/info.svg"></a>';
  windy_map_div.appendChild(windy_map_info_div);
}

function dwd_warn() {
  if (!location_data.dwd_warncellid) return;

  let dwd_warn_div = document.getElementById("dwd-warn");
  dwd_warn_div.classList.add("section");

  if (!debug) {
    let dwd_warn_script = document.createElement("script");
    dwd_warn_script.src =
      "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json";
    document.body.appendChild(dwd_warn_script);
  }
}

function dwd_trend() {
  if (!location_data.district) return;

  let id_mapping = {
    bw: "10738",
    by: "10870",
    be: "10382",
    bb: "10379",
    hb: "10224",
    hh: "10147",
    he: "10633",
    mv: "10162",
    ni: "10338",
    nw: "10400",
    rp: "10708",
    sl: "K2613",
    sn: "10488",
    st: "10361",
    sh: "10046",
    th: "10554",
  };

  /* 
  bw Baden-Württemberg
  by Bayern
  be Berlin
  bb Brandenburg
  hb Bremen
  hh Hamburg
  he Hessen
  mv Mecklenburg-Vorpommern
  ni Niedersachsen
  nw Nordrhein-Westfalen
  rp Rheinland-Pfalz
  sl Saarland
  sn Sachsen
  st Sachsen-Anhalt
  sh Schleswig-Holstein
  th Thüringen
  */

  if (!location_data.district in Object.keys(id_mapping)) return;

  let id = id_mapping[location_data.district];

  let dwd_trend_div = document.getElementById("dwd-trend");
  dwd_trend_div.classList.add("section");

  let dwd_trend_img = document.createElement("img");
  dwd_trend_img.src =
    "https://www.dwd.de/DWD/wetter/wv_allg/deutschland_trend/bilder/ecmwf_meg_" +
    id +
    ".png";
  if (debug)
    dwd_trend_img.src = "https://via.placeholder.com/950x680?text=dwd-trend";
  dwd_trend_img.alt = "dwd-trend";
  dwd_trend_div.appendChild(dwd_trend_img);

  let dwd_trend_info_div = document.createElement("div");
  dwd_trend_info_div.classList.add("info");
  dwd_trend_info_div.innerHTML =
    '<a href="https://www.dwd.de/DE/leistungen/trendvorhersage_regional/legende_trend_kurz.png?__blob=normal&v=5"><img src="/info.svg"/></a>';
  dwd_trend_div.appendChild(dwd_trend_info_div);
}

function meteoblue_simple() {
  if (!(location_data.meteoblue_simple && location_data.meteoblue_id)) return;

  let meteoblue_simple_div = document.getElementById("meteoblue-simple");
  meteoblue_simple_div.classList.add("section");

  let meteoblue_simple_iframe;
  if (debug) {
    meteoblue_simple_iframe = document.createElement("img");
    meteoblue_simple_iframe.src =
      "https://via.placeholder.com/805x623?text=meteoblue-simple";
  } else {
    meteoblue_simple_iframe = document.createElement("iframe");
    meteoblue_simple_iframe.src =
      "https://www.meteoblue.com/de/wetter/widget/three/" +
      location_data.meteoblue_id +
      "?geoloc=fixed&nocurrent=0&noforecast=0&days=7&tempunit=CELSIUS&windunit=KILOMETER_PER_HOUR&layout=bright";
    meteoblue_simple_iframe.setAttribute("frameborder", "0");
    meteoblue_simple_iframe.setAttribute("scrolling", "NO");
    meteoblue_simple_iframe.setAttribute("allowtransparency", "true");
    meteoblue_simple_iframe.setAttribute(
      "sandbox",
      "allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
    );
  }
  meteoblue_simple_iframe.alt = "meteoblue-simple";
  meteoblue_simple_iframe.style.width = "805px";
  meteoblue_simple_iframe.style.height = "623px";
  meteoblue_simple_div.appendChild(meteoblue_simple_iframe);

  let meteoblue_simple_a = document.createElement("a");
  meteoblue_simple_a.href =
    "https://www.meteoblue.com/de/wetter/woche/" +
    location_data.meteoblue_id +
    "?utm_source=weather_widget&utm_medium=linkus&utm_content=three&utm_campaign=Weather%2BWidget";
  meteoblue_simple_a.target = "_blank";
  meteoblue_simple_a.innerText = "meteoblue";

  let meteoblue_simple_a_div = document.createElement("div");
  meteoblue_simple_a_div.appendChild(meteoblue_simple_a);
  meteoblue_simple_div.appendChild(meteoblue_simple_a_div);

  let meteoblue_simple_hr = document.createElement("hr");
  meteoblue_simple_hr.classList.add("divider");
  meteoblue_simple_div.parentNode.insertBefore(
    meteoblue_simple_hr,
    meteoblue_simple_div.nextSibling
  );
}

function daswetter() {
  if (!location_data.daswetter) return;
  let daswetter_div = document.getElementById("daswetter");
  daswetter_div.classList.add("section");

  let daswetter_img = document.createElement("img");
  daswetter_img.src =
    "https://www.daswetter.com/wimages/foto" + location_data.daswetter + ".png";
  if (debug)
    daswetter_img.src = "https://via.placeholder.com/776x185?text=daswetter";
  daswetter_img.alt = "daswetter";
  daswetter_div.appendChild(daswetter_img);
}

function windguru() {
  if (!(location_data.windguru_uid && location_data.windguru_s)) return;
  let windguru_div = document.getElementById("windguru");
  windguru_div.classList.add("section");

  let windguru_loading_div = document.createElement("div");
  windguru_loading_div.classList.add("loading");

  if (debug) {
    let windguru_img = document.createElement("img");
    windguru_img.src = "https://via.placeholder.com/800x512?text=windguru";
    windguru_img.alt = "windguru";
    windguru_img.style.width = "100%";
    windguru_img.style.height = "512px";
    windguru_loading_div.appendChild(windguru_img);
  } else {
    let windguru_reference_script = document.createElement("script");
    windguru_reference_script.id = location_data.windguru_uid;
    windguru_loading_div.appendChild(windguru_reference_script);

    let arg = [
      "s=" + location_data.windguru_s,
      "m=3",
      "uid=" + location_data.windguru_uid,
      "wj=knots",
      "tj=c",
      "odh=0",
      "doh=24",
      "fhours=240",
      "vt=fcst_graph",
      "lng=de",
    ];
    let windguru_script = document.createElement("script");
    windguru_script.src =
      "https://www.windguru.cz/js/widget.php?" + arg.join("&");
    document.body.appendChild(windguru_script);
  }
  windguru_div.appendChild(windguru_loading_div);

  let windguru_info_div = document.createElement("div");
  windguru_info_div.classList.add("info");
  windguru_info_div.innerHTML =
    '<a href="/windguru-hilfe.png"><img src="/info.svg"></a>';
  windguru_div.appendChild(windguru_info_div);
}

window.addEventListener("load", function () {
  let asyncIframes = document.getElementsByClassName("asyncIframe");
  Array.from(asyncIframes).map((item) => {
    item.src = item.getAttribute("data-src");
  });
});

warnWetter = {};
warnWetter.loadWarnings = function (dwd_json) {
  let dwd_warn_div = document.getElementById("dwd-warn");
  let dwd_warncellid = location_data.dwd_warncellid;

  let alerts = dwd_json.warnings[dwd_warncellid] || [];
  let prealerts = dwd_json.vorabInformation[dwd_warncellid] || [];

  alerts = alerts
    .filter((x) => x !== undefined)
    .sort((a, b) => b.level - a.level);
  prealerts = prealerts
    .filter((x) => x !== undefined)
    .sort((a, b) => b.level - a.level);

  alerts = alerts.concat(prealerts);

  alerts.forEach((alert) => {
    let alert_div = document.createElement("div");
    alert_div.classList.add("level-" + alert.level);
    alert_div.classList.add("dwd-warn-element");

    let alert_headline = document.createElement("h3");
    alert_headline.innerText = alert.headline;
    alert_headline.classList.add("dwd-warn-headline");
    alert_div.appendChild(alert_headline);

    alert_div.appendChild(document.createElement("br"));
    let alert_date = document.createElement("strong");
    alert_date.innerText = new Date(alert.start).toLocaleString("de-DE", {
      weekday: "short",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (alert.end) {
      alert_date.innerText += " - ";

      if (new Date(alert.start).getDate() == new Date(alert.end).getDate()) {
        alert_date.innerText += new Date(alert.end).toLocaleString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        alert_date.innerText += new Date(alert.end).toLocaleString("de-DE", {
          weekday: "short",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    alert_headline.classList.add("dwd-warn-start");
    alert_div.appendChild(alert_date);

    let alert_description = document.createElement("p");
    alert_description.innerText = alert.description;
    alert_headline.classList.add("dwd-warn-description");
    alert_div.appendChild(alert_description);

    let alert_instruction = document.createElement("div");
    alert_instruction.classList.add("dwd-warn-instruction");
    let alert_instruction_id =
      "dwd-warn-instruction-" + Math.floor(Math.random() * 10000);

    let alert_instruction_input = document.createElement("input");
    alert_instruction_input.id = alert_instruction_id;
    alert_instruction_input.type = "checkbox";
    alert_instruction.appendChild(alert_instruction_input);

    let alert_instruction_label = document.createElement("label");
    alert_instruction_label.htmlFor = alert_instruction_id;
    alert_instruction.appendChild(alert_instruction_label);

    let alert_instruction_a = document.createElement("a");
    alert_instruction_a.tabindex = "0";
    alert_instruction_a.innerText = "Mögliche Gefahren anzeigen";
    alert_instruction_label.appendChild(alert_instruction_a);

    let alert_instruction_content = document.createElement("div");
    alert_instruction_content.classList.add("dwd-warn-instruction-content");

    let alert_instruction_p = document.createElement("p");
    alert_instruction_p.innerText = alert.instruction;
    alert_instruction_content.appendChild(alert_instruction_p);
    alert_instruction.appendChild(alert_instruction_content);

    alert_div.appendChild(alert_instruction);
    dwd_warn_div.appendChild(alert_div);
  });
};
