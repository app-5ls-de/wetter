var main_div = document.getElementById("main");
var widgets_div = document.getElementById("widgets");

function f(url, callback) {
  return fetch(url)
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
      callback(data);
    });
}
function format(number) {
  var PREFIXES = {
    6: "M",
    3: "k",
    0: "",
  };
  let maxExponent = Math.max(...Object.keys(PREFIXES).map(Number));

  function getExponent(n) {
    if (n === 0) {
      return 0;
    }
    return Math.floor(Math.log10(Math.abs(n)));
  }

  function precise(n) {
    return Number.parseFloat(n.toPrecision(2));
  }

  function toHumanString(sn) {
    // from https://www.npmjs.com/package/human-readable-numbers
    var n = precise(Number.parseFloat(sn));
    var e = Math.max(
      Math.min(3 * Math.floor(getExponent(n) / 3), maxExponent),
      -maxExponent
    );
    return precise(n / Math.pow(10, e)).toString() + PREFIXES[e];
  }

  if (Math.abs(number) >= 1000) return toHumanString(number);
  else return precise(number).toString();
}

var location_data;
var all_location_data;
f("/locations.json", (data) => {
  all_location_data = data;

  let params = new URLSearchParams(window.location.search);
  let location_name = params.get("location");
  if (location_name) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].name == location_name) {
        location_data = data[i];
        main_routine();
        break;
      }
    }
    if (!location_data) {
      localStorage.removeItem("lastvisited");
      window.location.href = window.location.origin;
    }
  } else if (typeof params.get("gps") === "string") {
    function geolocation_error(error) {
      document.getElementById("title-info").innerText =
        "Position nicht gefunden";
      console.error(error);
      throw "GeolocationError";
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((location) => {
        location_data = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };
        f(
          "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
            location_data.lat +
            "&lon=" +
            location_data.lon +
            "&zoom=10&addressdetails=1&accept-language=de",
          (nominatim_data) => {
            let accuracy = Math.max(
              location.coords.accuracy,
              distance(location_data, nominatim_data) * 1000
            );
            location_data.name = nominatim_data.address.city;
            document.getElementById("title-info").innerHTML =
              "aktueller Standort <small>±" + format(accuracy) + "m</small>";
            main_routine();
          }
        ).catch(geolocation_error);
      }, geolocation_error);
    } else {
      geolocation_error();
    }
  }
});

function main_routine() {
  document.getElementById("title-link").innerText = location_data.name;

  save_location();
  display_widgets();
}

async function display_widgets() {
  daswetter();
  meteoblue_simple();
  windguru();

  await meteoblue();
  dwd_trend();
  accuweather_link();
  knmi();
  dwd_warn();
  windy_map("waves");
  windy_map();
  windy_link();
}

function meteoblue() {
  let closest_data;
  if (location_data.meteoblue_src) {
    closest_data = location_data;
  } else {
    let closest = get_closest(
      location_data,
      all_location_data.filter((el) => el.meteoblue_src)
    );
    if (!closest) return;
    if (closest.distance > 176) return; // max is "Weil am Rhein": 175km
    closest_data = closest;
  }

  let meteoblue_div = document.createElement("div");
  meteoblue_div.id = "meteoblue";
  meteoblue_div.classList.add("section");
  widgets_div.appendChild(meteoblue_div);

  let meteoblue_img = document.createElement("img");
  meteoblue_img.alt = "meteoblue";

  let meteoblue_a = document.createElement("a");
  meteoblue_a.href =
    "https://www.meteoblue.com/de/wetter/woche/" + closest_data.meteoblue_id;
  meteoblue_a.target = "_blank";
  meteoblue_a.innerText = "Wetter " + closest_data.name + " - meteoblue";

  let meteoblue_info_div = document.createElement("div");
  meteoblue_info_div.classList.add("info");
  meteoblue_info_div.innerHTML =
    '<a href="/meteoblue-hilfe"><img src="/info.svg" /></a>';

  return new Promise((resolve, reject) => {
    meteoblue_img.addEventListener("load", resolve);
    meteoblue_img.addEventListener("error", reject);

    meteoblue_img.src = closest_data.meteoblue_src;
    if (debug)
      meteoblue_img.src =
        "https://via.placeholder.com/2220x1470?text=meteoblue";
    meteoblue_div.appendChild(meteoblue_img);
    meteoblue_div.appendChild(meteoblue_a);
    meteoblue_div.appendChild(meteoblue_info_div);
  });
}

function knmi() {
  if (location_data.lat < 33.5 || location_data.lat > 67.2) return;
  if (location_data.lon < -39.1 || location_data.lon > 35.3) return;

  let knmi_div = document.createElement("div");
  knmi_div.id = "knmi";
  knmi_div.classList.add("section");
  widgets_div.appendChild(knmi_div);

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

  let accuweather_div = document.createElement("div");
  accuweather_div.id = "accuweather-link";
  accuweather_div.classList.add("accuweather-link");
  widgets_div.appendChild(accuweather_div);

  let accuweather_a = document.createElement("a");
  accuweather_a.href =
    "https://www.accuweather.com/de/" + location_data.accuweather;
  accuweather_a.target = "_blank";
  accuweather_a.innerText = "MinuteCast von Accuweather";
  accuweather_div.appendChild(accuweather_a);
}

function windy_link() {
  let windy_div = document.createElement("div");
  windy_div.id = "windy-link";
  windy_div.classList.add("windy-link");
  widgets_div.appendChild(windy_div);

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

  let windy_map_div = document.createElement("div");
  windy_map_div.id = "windy-map";
  if (overlay_type == "waves") windy_map_div.id = "windy-map-waves";
  windy_map_div.classList.add("windy-map");
  widgets_div.appendChild(windy_map_div);

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
  let id_mapping = [
    {
      // Stuttgart
      lat: 48.7761,
      lon: 9.1775,
      id: "10738",
    },
    {
      // München
      lat: 48.133333,
      lon: 11.566667,
      id: "10870",
    },
    {
      // Berlin
      lat: 52.5167,
      lon: 13.3833,
      id: "10382",
    },
    {
      // Brandenburg
      lat: 52.4117,
      lon: 12.5561,
      id: "10379",
    },
    {
      // Bremen
      lat: 53.1153,
      lon: 8.7975,
      id: "10224",
    },
    {
      // Hamburg
      lat: 53.55,
      lon: 10.0,
      id: "10147",
    },
    {
      // Wiesbaden
      lat: 50.0825,
      lon: 8.24,
      id: "10633",
    },
    {
      // Schwerin
      lat: 53.6333,
      lon: 11.4167,
      id: "10162",
    },
    {
      // Hannover
      lat: 52.374444,
      lon: 9.738611,
      id: "10338",
    },
    {
      // Düsseldorf
      lat: 51.2311,
      lon: 6.7724,
      id: "10400",
    },
    {
      // Mainz
      lat: 50.0,
      lon: 8.2667,
      id: "10708",
    },
    {
      // Saarbrücken
      lat: 49.2333,
      lon: 7.0,
      id: "K2613",
    },
    {
      // Dresden
      lat: 51.05,
      lon: 13.74,
      id: "10488",
    },
    {
      // Magdeburg
      lat: 52.1278,
      lon: 11.6292,
      id: "10361",
    },
    {
      // Kiel
      lat: 54.3233,
      lon: 10.1394,
      id: "10046",
    },
    {
      // Erfurt
      lat: 50.9787,
      lon: 11.0328,
      id: "10554",
    },
  ];

  let closest = get_closest(location_data, id_mapping);
  if (!closest) return;
  if (closest.distance > 176) return; // max is "Weil am Rhein": 175km
  let id = closest.id;

  let dwd_trend_div = document.createElement("div");
  dwd_trend_div.id = "dwd-trend";
  dwd_trend_div.classList.add("section");
  widgets_div.appendChild(dwd_trend_div);

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

  let meteoblue_simple_div = document.createElement("div");
  meteoblue_simple_div.id = "meteoblue-simple";
  meteoblue_simple_div.classList.add("section");
  widgets_div.appendChild(meteoblue_simple_div);

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
  let daswetter_div = document.createElement("div");
  daswetter_div.id = "daswetter";
  daswetter_div.classList.add("section");
  widgets_div.appendChild(daswetter_div);

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

  let windguru_div = document.createElement("div");
  windguru_div.id = "windguru";
  windguru_div.classList.add("section");
  widgets_div.appendChild(windguru_div);

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
  let dwd_json_list = [];
  for (const key in dwd_json.warnings) {
    if (Object.hasOwnProperty.call(dwd_json.warnings, key)) {
      let element = dwd_json.warnings[key];
      element.forEach((el) => {
        el.category = "warnings";
      });
      dwd_json_list = dwd_json_list.concat(element);
    }
  }
  for (const key in dwd_json.vorabInformation) {
    if (Object.hasOwnProperty.call(dwd_json.vorabInformation, key)) {
      let element = dwd_json.vorabInformation[key];
      element.forEach((el) => {
        el.category = "vorabInformation";
      });
      dwd_json_list = dwd_json_list.concat(element);
    }
  }

  if (location_data.dwd_warncellid) {
    let alerts = dwd_json.warnings[location_data.dwd_warncellid] || [];
    let prealerts =
      dwd_json.vorabInformation[location_data.dwd_warncellid] || [];
    alerts.concat(prealerts);
    show_warnings(alerts);
  }

  f(
    "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
      location_data.lat +
      "&lon=" +
      location_data.lon +
      "&zoom=10&addressdetails=1",
    (data) => {
      let name = data.address.county ? data.address.county : data.address.city;
      name = name.toLowerCase();
      name = name.replace("landkreis", "");
      name = name.replace("kreis", "");
      name = name.trim();
      let results = fuzzysort.go(name, dwd_json_list, {
        threshold: -20000,
        allowTypo: false,
        key: "regionName",
      });

      let alerts = [];
      results.forEach((el) => {
        alerts.push(el.obj);
      });

      show_warnings(alerts);
    }
  );
};

function show_warnings(alerts) {
  let dwd_warn_div = document.getElementById("dwd-warn");

  alerts = alerts
    .filter((x) => x !== undefined)
    .sort((a, b) => b.level - a.level);

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
}

function save_location() {
  let lastvisited;
  try {
    lastvisited = JSON.parse(localStorage.getItem("lastvisited")) || [];
  } catch (e) {
    lastvisited = [];
  }

  lastvisited = lastvisited.filter(
    (element) => element.name != location_data.name
  );

  lastvisited.unshift({
    name: location_data.name,
  });

  lastvisited = lastvisited.slice(0, 5);

  localStorage.setItem("lastvisited", JSON.stringify(lastvisited));
}

function get_closest(target, array) {
  array.forEach((element) => {
    element.distance = distance(target, element);
  });

  let minimum = array.reduce((prev, curr) => {
    return prev.distance < curr.distance ? prev : curr;
  });
  return minimum;
}

function distance(obj1, obj2) {
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(obj2.lat - obj1.lat);
  var dLon = deg2rad(obj2.lon - obj1.lon);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(obj1.lat)) *
      Math.cos(deg2rad(obj2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}
