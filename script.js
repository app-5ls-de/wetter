var main_div = document.getElementById("main");
var widgets_div = document.getElementById("widgets");

async function fetch_json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  return data;
}

function format(number) {
  const PREFIXES = { 6: "M", 3: "k", 0: "" };
  const maxExponent = Math.max(...Object.keys(PREFIXES).map(Number));
  const minExponent = Math.min(...Object.keys(PREFIXES).map(Number));

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
      minExponent
    );
    return precise(n / Math.pow(10, e)).toString() + PREFIXES[e];
  }

  if (Math.abs(number) >= 1000) return toHumanString(number);
  else return precise(number).toString();
}

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
    this.then = (func) => this.promise.then(func);
    this.catch = (func) => this.promise.catch(func);
  }
}

var location_data,
  dwd_warn_promise = new Deferred();

async function getAddress() {
  if (location_data.address) return;

  const response = await fetch_json(
    "https://photon.komoot.io/reverse?lang=de&lat=" +
      location_data.lat +
      "&lon=" +
      location_data.lon
  );

  location_data.address = response.features[0].properties || {};
  location_data.name = "?";

  // use temporary variable for better readability
  let a = location_data.address;
  if (a.city) {
    location_data.name = a.city;
  } else if (a.town) {
    location_data.name = a.town;
  } else if (a.village) {
    location_data.name = a.village;
  } else if (a.municipality) {
    location_data.name = a.municipality;
  } else if (a.county) {
    location_data.name = a.county;
  } else if (a.state) {
    location_data.name = a.state;
  }

  if (!a.county) {
    if (a.district) {
      a.county = a.district;
    } else if (location_data.name != "?") {
      a.county = location_data.name;
    }
  }
}

let params = new URLSearchParams(window.location.search);
if (typeof params.get("gps") === "string") {
  document.getElementById("title-info").innerText = "lädt...";
  function geolocation_error(err) {
    document.getElementById("title-info").innerText = "Position nicht gefunden";
    console.error(err);
    throw "GeolocationError";
  }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((location) => {
      location_data = {
        lat: Math.round(location.coords.latitude * 100) / 100,
        lon: Math.round(location.coords.longitude * 100) / 100,
      };
      let accuracy = Math.max(
        location.coords.accuracy,
        distance(location_data, {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        }) * 1000
      );
      document.getElementById("title-info").innerText = "aktueller Standort";
      document.getElementById("title-info-small").innerText =
        " ±" + format(accuracy) + "m";

      getAddress()
        .then(() => {
          main_routine();
        })
        .catch(geolocation_error);
    }, geolocation_error);
  } else {
    geolocation_error();
  }
} else if (params.get("lat") && params.get("lon")) {
  function latlon_error(err) {
    document.getElementById("title-info").innerText = "Ort nicht gefunden";
    console.error(err);
    throw "LatLonError";
  }
  location_data = {
    lat: Math.round(parseFloat(params.get("lat")) * 100) / 100,
    lon: Math.round(parseFloat(params.get("lon")) * 100) / 100,
  };

  getAddress()
    .then(() => {
      main_routine();
    })
    .catch(latlon_error);
} else {
  localStorage.removeItem("lastvisited");
  localStorage.removeItem("quickresume");
  window.location.href = window.location.origin;
}

function main_routine() {
  document.getElementById("title-link").innerText = location_data.name;

  save_location();
  display_widgets();
}

function create_section(func, display_name, priority) {
  let disabled = [
    "brightsky",
    "knmi",
    "rainviewer",
    "windy_map",
    "windy_map_waves",
  ];

  let child_div = crel.div();
  widgets_div.appendChild(child_div);

  if (disabled.includes(func.name)) {
    let collapsable_content;
    crel(
      child_div,
      (collapsable_content = crel.button(
        {
          class: "btn btn-blue mx-auto block",
          on: {
            click: (e) => {
              collapsable_content.remove();
              e.stopPropagation();
              func(child_div);
            },
          },
        },
        display_name
      ))
    );
    return;
  } else {
    que.push({
      priority,
      run: () => func(child_div),
    });
  }
}

async function run_que() {
  que.sort((a, b) => a.priority - b.priority);

  for (const element of que) {
    try {
      let element_promise = element.run();
      if (element.priority) {
        await element_promise;
      }
    } catch (err) {
      console.error(err);
    }
  }
}

let que = [];

function display_widgets() {
  create_section(dwd_warn, "Wetterwarnung", 3);

  create_section(meteoblue, "Meteoblue Bild", 2);
  create_section(meteogram_metno, "Meteogram", 1);

  create_section(dwd_trend, "10 Tage Trend");
  create_section(sunrise, "Sonnenaufgang");

  create_section(rainviewer, "Regenradar");
  create_section(knmi, "Großwetterlage");

  create_section(brightsky, "10 Tage Temperatur");
  create_section(windy_map, "Windkarte");
  create_section(windy_map_waves, "Wellenkarte");

  run_que();
}

async function meteoblue(meteoblue_div) {
  let closest_data;
  let all_location_data = await fetch_json("/locations.json");
  if (location_data.meteoblue_src) {
    closest_data = location_data;
  } else {
    let closest = get_closest(
      location_data,
      all_location_data.filter((el) => el.meteoblue_src)
    );
    if (!closest) return;
    if (closest.distance > 30) return;
    closest_data = closest;
  }

  let meteoblue_img;
  crel(
    meteoblue_div,
    { id: "meteoblue", class: "" },
    (meteoblue_img = crel.img({ alt: "meteoblue" })),
    crel.a(
      {
        href:
          "https://www.meteoblue.com/de/wetter/woche/" +
          closest_data.meteoblue_id,
        target: "_blank",
        rel: "noopener",
        class: "before:hidden",
      },
      "Wetter " + closest_data.name + " - meteoblue"
    ),
    crel.div(
      { class: "info -mt-4" },
      crel.a(
        { href: "/meteoblue-hilfe" },
        crel.img({ src: "/info.svg", alt: "" })
      )
    )
  );

  await new Promise((resolve, reject) => {
    meteoblue_img.addEventListener("load", resolve);
    meteoblue_img.addEventListener("error", reject);

    meteoblue_img.src = closest_data.meteoblue_src;
    meteoblue_img.setAttribute("crossorigin", "anonymous");
  });
}

function knmi(knmi_div) {
  if (location_data.lat < 33.5 || location_data.lat > 67.2) return;
  if (location_data.lon < -39.1 || location_data.lon > 35.3) return;

  let knmi_animation_img;
  crel(
    knmi_div,
    { id: "knmi", class: "" },
    (knmi_animation_img = crel.img({ id: "animation", alt: "knmi" })),
    crel.div(
      { class: "info" },
      crel.a(
        { href: "/meteoblue-hilfe" },
        crel.img({ src: "/info.svg", alt: "" })
      )
    )
  );

  var knmi_baseurl =
    "https://cdn.knmi.nl/knmi/map/page/weer/waarschuwingen_verwachtingen/weerkaarten/";
  knmi_animation_img.setAttribute("crossorigin", "anonymous");

  function hour(date) {
    let hour = date.getUTCHours();
    return (hour < 10 ? "0" : "") + hour;
  }
  function day(date) {
    let day = date.getUTCDate();
    return (day < 10 ? "0" : "") + day;
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

  for (let i = 0; i < 2; i++) {
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

  knmi_div.addEventListener("click", () => {
    if (paused) interval = setInterval(nextframe, 1500);
    else clearInterval(interval);

    paused = !paused;
  });

  return new Promise((resolve, reject) => {
    knmi_animation_img.addEventListener("load", () => {
      loaded = true;
      resolve();
    });
    knmi_animation_img.addEventListener("error", reject);

    nextframe(); //show first frame
  });
}

function windy_map_waves(windy_map_div) {
  return windy_map(windy_map_div, "waves");
}

function windy_map(windy_map_div, overlay_type) {
  if (overlay_type && overlay_type != "waves") return;

  let windy_map_iframe = crel.iframe({ class: "w-full h-full" });

  crel(
    windy_map_div,
    {
      id: overlay_type ? "windy-map-" + overlay_type : "windy-map",
      class: "w-full h-50-screen",
    },
    windy_map_iframe,
    crel.div(
      { class: "info" },
      crel.a(
        {
          href: "https://community.windy.com/topic/3361/description-of-weather-overlays",
          target: "_blank",
          rel: "noopener",
        },
        crel.img({ src: "/info.svg", alt: "" })
      ),
      crel.a(
        {
          href: "https://community.windy.com/topic/12/what-source-of-weather-data-windy-use",
          target: "_blank",
          rel: "noopener",
        },
        crel.img({ src: "/info.svg", alt: "" })
      )
    )
  );

  return new Promise((resolve, reject) => {
    crel(windy_map_iframe, {
      on: {
        load: resolve,
        error: reject,
      },
    });

    crel(windy_map_iframe, {
      title: "windy-map",
      frameborder: "0",
      importance: "low",
      loading: "lazy",
    });
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
  });
}

function dwd_warn(dwd_warn_div) {
  warnWetter.element = dwd_warn_div;

  let dwd_warn_script = crel.script({ crossorigin: "anonymous" });
  document.body.appendChild(dwd_warn_script);

  crel(dwd_warn_script, {
    src: "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json",
  });

  return dwd_warn_promise;
}

function dwd_trend(dwd_trend_div) {
  let id_mapping = [
    // Stuttgart
    { lat: 48.7761, lon: 9.1775, id: "10738" },
    // München
    { lat: 48.133333, lon: 11.566667, id: "10870" },
    // Berlin
    { lat: 52.5167, lon: 13.3833, id: "10382" },
    // Brandenburg
    { lat: 52.4117, lon: 12.5561, id: "10379" },
    // Bremen
    { lat: 53.1153, lon: 8.7975, id: "10224" },
    // Hamburg
    { lat: 53.55, lon: 10.0, id: "10147" },
    // Wiesbaden
    { lat: 50.0825, lon: 8.24, id: "10633" },
    // Schwerin
    { lat: 53.6333, lon: 11.4167, id: "10162" },
    // Hannover
    { lat: 52.374444, lon: 9.738611, id: "10338" },
    // Düsseldorf
    { lat: 51.2311, lon: 6.7724, id: "10400" },
    // Mainz
    { lat: 50.0, lon: 8.2667, id: "10708" },
    // Saarbrücken
    { lat: 49.2333, lon: 7.0, id: "K2613" },
    // Dresden
    { lat: 51.05, lon: 13.74, id: "10488" },
    // Magdeburg
    { lat: 52.1278, lon: 11.6292, id: "10361" },
    // Kiel
    { lat: 54.3233, lon: 10.1394, id: "10046" },
    // Erfurt
    { lat: 50.9787, lon: 11.0328, id: "10554" },
  ];

  let closest = get_closest(location_data, id_mapping);
  if (!closest) return;
  if (closest.distance > 60) return;
  let id = closest.id;

  let dwd_trend_img;
  crel(
    dwd_trend_div,
    { id: "dwd-trend" },
    (dwd_trend_img = crel.img({ alt: "dwd-trend" })),
    crel.div(
      { class: "info" },
      crel.a(
        {
          href: "https://www.dwd.de/DE/leistungen/trendvorhersage_regional/legende_trend_kurz.png?__blob=normal&v=5",
          target: "_blank",
          rel: "noopener",
        },
        crel.img({ src: "/info.svg", alt: "" })
      )
    )
  );

  return new Promise((resolve, reject) => {
    crel(dwd_trend_img, {
      on: {
        load: resolve,
        error: reject,
      },
    });

    dwd_trend_img.setAttribute("crossorigin", "anonymous");
    dwd_trend_img.src =
      "https://www.dwd.de/DWD/wetter/wv_allg/deutschland_trend/bilder/ecmwf_meg_" +
      id +
      ".png";
  });
}

async function meteogram_metno(meteogram_div) {
  let meteogram_canvas, meteogram_button, meteogram_container;
  crel(
    meteogram_div,
    {
      id: "metno",
      class: "overflow-x-auto",
    },
    (meteogram_container = crel.div(
      {
        class: "h-50-screen relative w-full min-w-sm",
      },
      (meteogram_canvas = crel.canvas({
        class: "w-full h-full",
      })),
      (meteogram_button = crel.button(
        {
          class:
            "btn btn-blue-transparent right-20 top-4 absolute inline-block",
          on: {
            click: async () => {
              meteogram_button.remove();

              crel(meteogram_container, {
                style: { "min-width": "1300px" },
              });

              chart.update();

              // give chart time to animate growing to the new width
              await new Promise((resolve) => {
                setTimeout(resolve, 1000);
              });

              chart.data.labels = data.time;
              chart.data.datasets[0].data = data.air_temperature;
              chart.data.datasets[1].data = data.precipitation_amount;
              chart.data.datasets[2].data = data.cloud_area_fraction_low;
              chart.data.datasets[3].data = data.cloud_area_fraction_medium;
              chart.data.datasets[4].data = data.cloud_area_fraction_high;

              chart.update();
            },
          },
        },
        "Mehr..."
      ))
    ))
  );

  const response = await fetch_json(
    "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=" +
      location_data.lat +
      "&lon=" +
      location_data.lon
  );

  let data = {};
  data.time = response.properties.timeseries.map((x) => x.time);
  data.dates = data.time.map((x) => new Date(x));
  data.precipitation_amount = response.properties.timeseries.map((x) => {
    if (x.data.next_1_hours)
      return x.data.next_1_hours.details.precipitation_amount;
    if (x.data.next_6_hours)
      return (
        Math.round(
          (x.data.next_6_hours.details.precipitation_amount / 6) * 10
        ) / 10
      );
  });

  data.symbol_code = response.properties.timeseries.map(
    (x) => x.data.next_1_hours?.summary.symbol_code
  );
  data.last_hourly = response.properties.timeseries.findIndex(
    (element) => !element.data.next_1_hours
  );

  Object.keys(response.properties.timeseries[0].data.instant.details).forEach(
    (key) => {
      data[key] = response.properties.timeseries.map(
        (x) => x.data.instant.details[key]
      );
    }
  );

  let dates = data.dates.slice(0, data.last_hourly + 1).map((x) => x.getDate());
  let dates_unique = [...new Set(dates)];

  //remove trival first date
  dates_unique.shift();

  let annotations = dates_unique.map((x) => {
    let index = dates.indexOf(x);
    let reference_time = data.dates[index];
    return {
      type: "line",
      scaleID: "x",
      value: index - 0.5, // center in between bars
      borderColor: "black",
      label: {
        content: reference_time.toLocaleDateString("de-DE", {
          day: "numeric",
          month: "numeric",
        }),
        enabled: true,
        rotation: "auto",
      },
    };
  });

  annotations.push({
    type: "line",
    scaleID: "x",
    value: data.last_hourly + 0.5 + 0.01, // center between the bars, but move it a little to the right so that it is slightly out of the viewindow when not unfolded
    borderColor: "darkred",
  });

  annotations.push({
    type: "line",
    scaleID: "yr2",
    borderWidth: 1,
    value: 0,
    borderColor: "lightgray",
  });

  let chart = new Chart(meteogram_canvas, {
    type: "line",
    data: {
      labels: data.time.slice(0, data.last_hourly + 1),
      datasets: [
        {
          label: "Temperatur",
          data: data.air_temperature.slice(0, data.last_hourly + 1),
          backgroundColor: "darkgray",
          borderColor: "darkgray",
          yAxisID: "yl2",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          unit: "°C",
        },
        {
          type: "bar",
          label: "Niederschlag",
          data: data.precipitation_amount.slice(0, data.last_hourly + 1),
          backgroundColor: "blue",
          borderColor: "black",
          yAxisID: "yr2",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          unit: "mm/h",
        },
        {
          label: "Niedrig",
          data: data.cloud_area_fraction_low.slice(0, data.last_hourly + 1),
          backgroundColor: "rgba(75, 85, 99)",
          borderColor: "rgba(75, 85, 99)",
          yAxisID: "yl1",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          unit: "%",
          elements: {
            point: {
              radius: 0,
            },
          },
        },
        {
          label: "Mittel",
          data: data.cloud_area_fraction_medium.slice(0, data.last_hourly + 1),
          backgroundColor: "rgba(156, 163, 175)",
          borderColor: "rgba(156, 163, 175)",
          yAxisID: "yl1",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          unit: "%",
          elements: {
            point: {
              radius: 0,
            },
          },
        },
        {
          label: "Hoch",
          data: data.cloud_area_fraction_high.slice(0, data.last_hourly + 1),
          backgroundColor: "rgba(209, 213, 219)",
          borderColor: "rgba(209, 213, 219)",
          yAxisID: "yr1",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          unit: "%",
          elements: {
            point: {
              radius: 0,
            },
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Stunde",
          },
          ticks: {
            callback: function (val) {
              return new Date(this.getLabelForValue(val)).getHours();
            },
          },
        },
        yl1: {
          type: "linear",
          display: true,
          position: "left",
          offset: false,
          stack: "meteogram",
          min: 0,
          max: 100,
          ticks: {
            stepSize: 50,
            count: 3,
          },
          title: {
            display: true,
            text: "Wolkenbedeckung",
          },
        },
        yr2: {
          type: "linear",
          display: true,
          position: "right",
          offset: true,
          stack: "meteogram",
          stackWeight: 2,
          min: 0,
          suggestedMax: 5,
          grid: {
            // only want the grid lines for one axis to show up
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: "Niederschlag",
          },
        },
        yr1: {
          type: "linear",
          display: true,
          position: "right",
          offset: false,
          stack: "meteogram",
          min: 0,
          max: 100,
          grid: {
            // only want the grid lines for one axis to show up
            drawOnChartArea: false,
          },
          ticks: {
            stepSize: 50,
            count: 3,
          },
          title: {
            display: true,
            text: "Wolkenbedeckung",
          },
        },
        yl2: {
          type: "linear",
          display: true,
          position: "left",
          offset: true,
          stack: "meteogram",
          grace: "5%",
          suggestedMax: 15,
          stackWeight: 2,
          ticks: {
            stepSize: 5,
          },
          title: {
            display: true,
            text: "Temperatur",
          },
        },
      },

      plugins: {
        tooltip: {
          position: "nearest",
          callbacks: {
            title: (item) => new Date(item[0].label).toLocaleString("de-DE"),
            label: function (context) {
              var label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              return (
                label + context.formattedValue + " " + context.dataset.unit
              );
            },
          },
        },
        legend: false,
        autocolors: false,
        annotation: {
          annotations,
        },
      },
    },
  });
}

async function brightsky(brightsky_div) {
  let brightsky_canvas, brightsky_button, brightsky_container;
  crel(
    brightsky_div,
    {
      id: "brightsky",
      class: "overflow-x-auto",
    },
    (brightsky_container = crel.div(
      {
        class: "h-50-screen relative w-full min-w-sm",
      },
      (brightsky_canvas = crel.canvas({
        class: "w-full h-full",
      })),
      (brightsky_button = crel.button(
        {
          class:
            "btn btn-blue-transparent right-20 top-4 absolute inline-block",
          on: {
            click: async () => {
              crel(brightsky_button, { disabled: true });
              let new_data;
              try {
                days_loaded += 1;
                new_data = await fetch_json(
                  brightsky_base_url +
                    addDays(new Date(), days_loaded).toISOString().split("T")[0]
                );
              } catch (err) {
                console.error(err);
                brightsky_button.remove();
                return;
              }
              crel(brightsky_container, {
                style: { "min-width": 150 * days_loaded + "px" },
              });

              add_data([new_data]);

              chart.data.labels = data_series.timestamp;
              chart.data.datasets[0].data = data_series.temperature;
              chart.data.datasets[1].data = data_series.precipitation;

              //chart.options.plugins.annotation.annotations = annotations;
              chart.options.plugins.annotation.annotations = [];

              chart.update();
              brightsky_button.removeAttribute("disabled");
            },
          },
        },
        "Mehr..."
      ))
    ))
  );

  addDays = (date, days) => {
    if (days == 0) return date;
    let new_date = new Date(date.valueOf());
    new_date.setDate(new_date.getDate() + days);
    return new_date;
  };

  let brightsky_base_url =
    "https://api.brightsky.dev/weather?lat=" +
    location_data.lat +
    "&lon=" +
    location_data.lon +
    "&date=";

  let data_array = [
    fetch_json(
      brightsky_base_url + addDays(new Date(), 0).toISOString().split("T")[0]
    ),
    fetch_json(
      brightsky_base_url + addDays(new Date(), 1).toISOString().split("T")[0]
    ),
    fetch_json(
      brightsky_base_url + addDays(new Date(), 2).toISOString().split("T")[0]
    ),
  ];
  let days_loaded = 2;
  data_array = await Promise.all(data_array);

  let data = { weather: [], sources: [] };
  let data_series = {};
  let annotations = [];

  function add_data(array_of_new_data) {
    data = array_of_new_data.reduce((previous, current) => {
      if (
        previous.weather[previous.weather.length - 1]?.timestamp ==
        current.weather[0].timestamp
      ) {
        previous.weather.pop();
      }
      previous.weather.push(...current.weather);
      previous.sources.push(...current.sources);
      return previous;
    }, data);

    data_series = {};

    Object.keys(data.weather[0]).forEach((key) => {
      data_series[key] = data.weather.map((x) => x[key]);
    });
    data_series.hours = data.weather.map((x) =>
      new Date(x.timestamp).getHours()
    );
    data_series.dates = data.weather.map((x) => new Date(x.timestamp));

    let dates = data.weather.map((x) => new Date(x.timestamp).getDate());
    let dates_unique = [...new Set(dates)];

    //remove trival first and last date
    dates_unique.pop();
    dates_unique.shift();

    let new_annotations = dates_unique.map((x) => {
      let index = dates.indexOf(x);
      let reference = data.weather[index];
      return {
        type: "line",
        identifier: true,
        scaleID: "x",
        value: index - 0.5, // center in between bars
        borderColor: "black",
        label: {
          content: new Date(reference.timestamp).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "numeric",
          }),
          enabled: true,
          rotation: "auto",
        },
      };
    });
    annotations = annotations.filter((element) => !element.identifier);

    annotations.push(...new_annotations);
  }

  add_data(data_array);

  let index = data.weather.findIndex(
    (element) => +new Date(element.timestamp) > +new Date()
  );

  index -= 1; // the function above find the first element that is later than now
  index -= 0.5; // center in between bars
  index += new Date().getMinutes() / 60;

  annotations.unshift({
    type: "line",
    scaleID: "x",
    borderDash: [5, 5],
    value: index,
    borderColor: "black",
  });

  let chart = new Chart(brightsky_canvas, {
    type: "line",
    data: {
      labels: data_series.timestamp,
      datasets: [
        {
          label: "Temperatur",
          data: data_series.temperature,
          backgroundColor: "darkgray",
          borderColor: "darkgray",
          yAxisID: "y",
          cubicInterpolationMode: "monotone",
          tension: 0.4,
        },
        {
          type: "bar",
          label: "Niederschlag",
          data: data_series.precipitation,
          backgroundColor: "blue",
          borderColor: "black",
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      stacked: false,

      scales: {
        x: {
          title: {
            display: true,
            text: "Stunde",
          },
          ticks: {
            callback: function (val) {
              return new Date(this.getLabelForValue(val)).getHours();
            },
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Temperatur",
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          min: 0,
          suggestedMax: 5,
          title: {
            display: true,
            text: "Niederschlag",
          },
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
        },
      },

      plugins: {
        tooltip: {
          position: "nearest",
          callbacks: {
            title: (item) => new Date(item[0].label).toLocaleString("de-DE"),
            label: function (context) {
              var label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }

              if (context.datasetIndex == 0) {
                return label + context.formattedValue + " °C";
              }
              if (context.datasetIndex == 1) {
                return label + context.formattedValue + " mm";
              }
              return label + context.formattedValue;
            },
          },
        },
        legend: false,
        autocolors: false,
        annotation: {
          annotations,
        },
      },
    },
  });
}

async function sunrise(sunrise_div) {
  crel(sunrise_div, {
    id: "sunrise",
    class: "flex justify-center flex-row flex-wrap mx-auto",
  });

  function generate_sunrise_half(first, second, svg_path) {
    return crel.div(
      { class: "xs:mx-8 p-4 whitespace-nowrap" },
      crel.img({
        class: "!w-16 text-gray-500 block mx-auto",
        src: svg_path,
        alt: "",
      }),
      crel.br(),
      crel.p(
        { class: "inline-block" },
        new Date(first).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " Uhr"
      ),
      crel.p(
        { class: "tooltip inline-block" },
        "(" +
          new Date(second).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }) +
          ")",
        crel.span({ class: "tooltip-content" }, "Dämmerung")
      )
    );
  }

  const data = await fetch_json(
    "https://api.sunrise-sunset.org/json?lat=" +
      location_data.lat +
      "&lng=" +
      location_data.lon +
      "&formatted=0"
  );
  crel(
    sunrise_div,
    generate_sunrise_half(
      data.results.sunrise,
      data.results.civil_twilight_begin,
      "/sunrise.svg"
    ),
    generate_sunrise_half(
      data.results.sunset,
      data.results.civil_twilight_end,
      "/sunset.svg"
    )
  );
}

var rainviewer_doubleClick_timer;
function rainviewer(rainviewer_div) {
  let rainviewer_map_div, rainviewer_info_div, rainviewer_timestamp_div;
  crel(
    rainviewer_div,
    { id: "rainviewer" },
    (rainviewer_map_div = crel.div({
      id: "rainviewer-map",
      class: "w-full h-50-screen",
    }))
  );

  rainviewer_info_div = crel.div(
    {
      class: "leaflet-bar",
      id: "rainviewer-control",
      on: {
        pointerenter: () => {
          map.doubleClickZoom.disable();
          rainviewer_map_div.classList.add("no-gesture-handling");

          clearTimeout(rainviewer_doubleClick_timer);
          rainviewer_doubleClick_timer = setTimeout(() => {
            map.doubleClickZoom.enable();
          }, 500);
        },
        pointerleave: () => {
          rainviewer_map_div.classList.remove("no-gesture-handling");
        },
      },
    },
    crel.a(
      {
        on: {
          click: () => {
            stop();
            showFrame(animationPosition - 1);
            return;
          },
        },
      },
      crel.img({ src: "/previous.svg" })
    ),
    crel.a(
      {
        on: {
          click: (e) => {
            playStop();
            return;
          },
        },
      },
      crel.img({ class: "play-icon", src: "/play.svg" }),
      crel.img({ class: "pause-icon", src: "/pause.svg" }),
      (rainviewer_timestamp_div = crel.div({ class: "text-center" }))
    ),
    crel.a(
      {
        on: {
          click: () => {
            stop();
            showFrame(animationPosition + 1);
            return;
          },
        },
      },
      crel.img({ src: "/next.svg" })
    )
  );

  var map = L.map(rainviewer_map_div, {
    zoomSnap: 1,
    maxZoom: 12,
    gestureHandling: true,
    gestureHandlingOptions: {
      text: {
        touch: "Verschieben der Karte mit zwei Fingern",
        scroll: "Verwende Strg+Scrollen zum zoomen der Karte",
        scrollMac: "Verwende \u2318+Scrollen zum zoomen der Karte",
      },
    },
  }).setView([location_data.lat, location_data.lon], 9);

  L.marker([location_data.lat, location_data.lon], {
    icon: L.divIcon({
      html: "&#9679;" /* "&#8226;" */ /* "&#11044;" */,
      className: "text-gray-600",
    }),
  }).addTo(map);

  //"https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);

  var rainviewer_control = L.control({ position: "bottomleft" });

  rainviewer_control.onAdd = () => {
    return rainviewer_info_div;
  };

  rainviewer_control.addTo(map);

  var apiData = {};
  var mapFrames = [];
  var lastPastFramePosition = 0;
  var radarLayers = [];

  var animationPosition = 0;
  var animationTimer = false;

  fetch_json("https://api.rainviewer.com/public/weather-maps.json").then(
    (data) => {
      apiData = data;
      if (!apiData) {
        return;
      }
      if (apiData.radar && apiData.radar.past) {
        let one_hour_ago = Date.now() / 1000 - 3600;
        mapFrames = apiData.radar.past.filter(
          (element) => element.time > one_hour_ago
        );
        if (apiData.radar.nowcast) {
          mapFrames = mapFrames.concat(apiData.radar.nowcast);
        }

        lastPastFramePosition = mapFrames.length;

        // show the last "past" frame
        let now = Date.now() / 1000;
        for (let i = mapFrames.length - 1; i >= 0; i--) {
          if (mapFrames[i].time < now) {
            lastPastFramePosition = i;
            break;
          }
        }

        showFrame(lastPastFramePosition);
      }
    }
  );

  function addLayer(frame) {
    if (!radarLayers[frame.path]) {
      radarLayers[frame.path] = new L.TileLayer(
        apiData.host + frame.path + "/256/{z}/{x}/{y}/8/1_1.png",
        {
          tileSize: 256,
          opacity: 0.001,
          zIndex: frame.time,
        }
      );
    }
    if (!map.hasLayer(radarLayers[frame.path])) {
      map.addLayer(radarLayers[frame.path]);
    }
  }

  function changeRadarPosition(position, preloadOnly) {
    while (position >= mapFrames.length) {
      position -= mapFrames.length;
    }
    while (position < 0) {
      position += mapFrames.length;
    }

    var currentFrame = mapFrames[animationPosition];
    var nextFrame = mapFrames[position];

    addLayer(nextFrame);

    if (preloadOnly) {
      return;
    }

    animationPosition = position;

    if (radarLayers[currentFrame.path]) {
      radarLayers[currentFrame.path].setOpacity(0);
    }
    radarLayers[nextFrame.path].setOpacity(100);

    if (nextFrame.time > Date.now() / 1000) {
      rainviewer_timestamp_div.classList.add("text-yellow-500");
    } else {
      rainviewer_timestamp_div.classList.remove("text-yellow-500");
    }

    rainviewer_timestamp_div.innerText =
      new Date(nextFrame.time * 1000).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " Uhr";
  }

  function showFrame(nextPosition) {
    var preloadingDirection = nextPosition - animationPosition > 0 ? 1 : -1;

    changeRadarPosition(nextPosition);

    // preload next next frame
    changeRadarPosition(nextPosition + preloadingDirection, true);
  }

  function stop() {
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = false;
      rainviewer_info_div.classList.remove("running");
      return true;
    }
    return false;
  }

  function play() {
    showFrame(animationPosition + 1);
    animationTimer = setTimeout(play, 500);
    rainviewer_info_div.classList.add("running");
  }

  function playStop() {
    if (!stop()) {
      play();
    }
  }
}

warnWetter = {};
warnWetter.loadWarnings = async (dwd_json) => {
  try {
    await warnWetter._loadWarnings(dwd_json);
    dwd_warn_promise.resolve();
  } catch (err) {
    console.error(err);
    dwd_warn_promise.reject(err);
  }
};

warnWetter._loadWarnings = async function (dwd_json) {
  let alerts_list = [];
  for (const key in dwd_json.warnings) {
    if (Object.hasOwnProperty.call(dwd_json.warnings, key)) {
      let element = dwd_json.warnings[key];
      element.forEach((el) => {
        el.category = "warnings";
        el.id = key;
      });
      alerts_list = alerts_list.concat(element);
    }
  }
  for (const key in dwd_json.vorabInformation) {
    if (Object.hasOwnProperty.call(dwd_json.vorabInformation, key)) {
      let element = dwd_json.vorabInformation[key];
      element.forEach((el) => {
        el.category = "vorabInformation";
        el.id = key;
      });
      alerts_list = alerts_list.concat(element);
    }
  }

  let warncellids = [];
  try {
    await getAddress();
  } catch (err) {
    console.error(err);
  }

  let county = location_data.address.county;
  if (!county) {
    console.error("district not found");
    return;
  }
  county = county
    .toLowerCase()
    .replace("landkreis", "")
    .replace("kreis", "")
    .trim();
  let results = fuzzysort.go(county, alerts_list, {
    threshold: -20000,
    allowTypo: false,
    key: "regionName",
  });

  results.forEach((el) => {
    warncellids.push(el.obj.id);
  });

  let dwd_warn_div = warnWetter.element;

  let alerts = [];
  warncellids = [...new Set(warncellids)];
  alerts_list.forEach((element) => {
    if (warncellids.includes(element?.id)) {
      alerts.push(element);
    }
  });

  alerts = alerts
    .sort((a, b) => a.start - b.start)
    .sort((a, b) => b.level - a.level)
    .filter(
      (value, index, array) =>
        index ==
        array.findIndex(
          (t) =>
            t.regionName === value.regionName &&
            t.event === value.event &&
            t.start === value.start &&
            t.end === value.end &&
            t.level === value.level &&
            t.type === value.type &&
            t.altitudeStart === value.altitudeStart &&
            t.altitudeEnd === value.altitudeEnd
        )
    );

  alerts.forEach((alert) => {
    let alert_date,
      alert_info_p,
      alert_div = crel.div(
        {
          class:
            "lg:m-12 my-4 p-2 border-4 border-gray-400 border-solid dwd-warn-level-" +
            alert.level,
        },
        crel.h3(alert.headline),
        crel.br(),
        crel.div(
          { class: "flex flex-wrap justify-between items-center" },
          (alert_date = crel.strong({ class: "inline mr-2" })),
          (alert_info_p = crel.p({ class: "inline text-gray-500" }))
        )
      );

    if (alert.category == "vorabInformation") {
      alert_div.classList.add("border-dotted");
    }

    alert_date.innerText = new Date(alert.start).toLocaleString("de-DE", {
      weekday: "short",
      month: "short",
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
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    alert_info_p.innerText = alert.regionName;

    if (alert.description) alert_div.appendChild(crel.p(alert.description));

    if (alert.instruction) {
      alert_instruction_id = "collapsible-" + Math.floor(Math.random() * 10000);
      alert_div.appendChild(
        crel.div(
          { class: "collapsible" },
          crel.input({ type: "checkbox", id: alert_instruction_id }),
          crel.label(
            { for: alert_instruction_id },
            crel.a({ tabindex: "0" }, "Mögliche Gefahren anzeigen")
          ),
          crel.div({ class: "collapsible-content" }, crel.p(alert.instruction))
        )
      );
    }

    dwd_warn_div.appendChild(alert_div);
  });
};

function save_location() {
  localStorage.setItem("quickresume", location.pathname + location.search);

  let to_add;
  let params = new URLSearchParams(window.location.search);
  if (params.get("lat") && params.get("lon")) {
    to_add = {
      name: location_data.name,
      lat: location_data.lat,
      lon: location_data.lon,
    };
  }

  if (to_add) {
    let lastvisited;
    try {
      lastvisited = JSON.parse(localStorage.getItem("lastvisited")) || [];
    } catch (e) {
      lastvisited = [];
    }

    let to_add_strigified = JSON.stringify(to_add, Object.keys(to_add).sort());
    lastvisited = lastvisited.filter(
      (element) =>
        to_add_strigified !=
        JSON.stringify(element, Object.keys(element).sort())
    );

    if (to_add) {
      lastvisited.unshift(to_add);

      lastvisited = lastvisited.slice(0, 5);
      localStorage.setItem("lastvisited", JSON.stringify(lastvisited));
    }
  }
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
