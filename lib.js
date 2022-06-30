const debug =
  location.hostname == "localhost" || location.hostname == "127.0.0.1";
var lang = "en";
const language = navigator.language || navigator.userLanguage || "en";
if (language.startsWith("de")) lang = "de";

if (lang == "de") {
  document.title = "Wetter";
  document.getElementById("title").innerText = "Wetter";
}

async function fetch_json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  return data;
}

function Place(
  lat,
  lon,
  name,
  {
    countryCode = "",
    timezone = "Europe/Berlin",
    elevation = 0,
    isGeolocation = false,
    accuracy = 0,
  } = {}
) {
  this.name = name;
  this.countryCode = countryCode;
  this.lat = lat;
  this.lon = lon;
  this.timezone = timezone;
  this.elevation = elevation;
  this.isGeolocation = isGeolocation;
  this.accuracy = accuracy;
  this.options = { name, countryCode, timezone, elevation, isGeolocation };
}

function distance(place1, place2) {
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const rEarth = 6371000; // radius of the earth in meter
  const dLat = deg2rad(place2.lat - place1.lat);
  const dLon = deg2rad(place2.lon - place1.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 *
      Math.cos(deg2rad(place1.lat)) *
      Math.cos(deg2rad(place2.lat));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = rEarth * c;
  return distance;
}

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
    this.then = (func) => this.promise.then(func);
    this.catch = (func) => this.promise.catch(func);
    this.finally = (func) => this.promise.finally(func);
    this.setPromise = (promise) =>
      promise.then(this.resolve).catch(this.reject);
  }
}

const msToBeaufort = (ms) => Math.round(Math.cbrt(Math.pow(ms / 0.836, 2)));

function weatherConditionNameFromId(id, icon) {
  const dayNight = icon.includes("d") ? "day" : "night";
  if (id >= 200 && id <= 232) {
    return "thunderstorms" + dayNight;
  } else if (id >= 300 && id <= 321) {
    return "partly-cloudy-" + dayNight + "-drizzle";
  } else if (id >= 500 && id <= 531) {
    return "partly-cloudy-" + dayNight + "-rain";
  } else if (id >= 600 && id <= 622) {
    return "partly-cloudy-" + dayNight + "-snow";
  } else if (id >= 701 && id <= 781) {
    return "partly-cloudy-" + dayNight + "-fog";
  } else if (id === 800) {
    return "clear-" + dayNight;
  } else if (id === 801) {
    return "partly-cloudy-" + dayNight;
  } else if (id === 802) {
    return "cloudy";
  } else if (id === 803 || id === 804) {
    return "overcast-" + dayNight;
  } else {
    return "not-available";
  }
}

const cachePrefix = "cache";
const removeCache = () =>
  debug ||
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(cachePrefix)) {
      localStorage.removeItem(key);
    }
  });
removeCache();

async function openweathermap(place) {
  const cacheID =
    cachePrefix + "-openweathermap-" + place.lat + "," + place.lon;
  if (localStorage.getItem(cacheID) && debug)
    return JSON.parse(localStorage.getItem(cacheID));

  const apiKey =
    "4fbc2ce2fc600e6" + /* if you're a bot, fuck off */ "e450dd4bbde8f28be";
  const data = await fetch_json(
    "https://api.openweathermap.org/data/2.5/onecall?units=metric&lang=en&lat=" +
      place.lat +
      "&lon=" +
      place.lon +
      "&appid=" +
      apiKey +
      "&lang=" +
      lang
  );

  if (debug) localStorage.setItem(cacheID, JSON.stringify(data));
  return data;
}

async function openweathermapForecast(place) {
  const cacheID =
    cachePrefix + "-openweathermapforecast-" + place.lat + "," + place.lon;
  if (localStorage.getItem(cacheID) && debug)
    return JSON.parse(localStorage.getItem(cacheID));

  const apiKey =
    "4fbc2ce2fc600e6" + /* if you're a bot, fuck off */ "e450dd4bbde8f28be";
  const data = await fetch_json(
    "https://api.openweathermap.org/data/2.5/forecast?units=metric&lang=en&lat=" +
      place.lat +
      "&lon=" +
      place.lon +
      "&appid=" +
      apiKey +
      "&lang=" +
      lang
  );

  if (debug) localStorage.setItem(cacheID, JSON.stringify(data));
  return data;
}

const openMeteo = (place) =>
  fetch_json(
    "https://api.open-meteo.com/v1/forecast?windspeed_unit=ms&timeformat=unixtime&latitude=" +
      place.lat +
      "&longitude=" +
      place.lon +
      "&hourly=temperature_2m,precipitation,weathercode,cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m,winddirection_10m,snow_depth" +
      "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours&past_days=1&timezone=" +
      place.timezone +
      "&current_weather=true"
  );

const mostCommon = (arr) =>
  Array.from(
    arr
      .reduce((acc, val) => acc.set(val, (acc.get(val) || 0) + 1), new Map())
      .entries()
  ).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

const zip = (...arr) =>
  Array(Math.max(...arr.map((a) => a.length)))
    .fill()
    .map((_, i) => arr.map((a) => a[i]));

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const debounce = (func, delay) => {
  let inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
};

function savePlaces() {
  localStorage.setItem(
    "places",
    JSON.stringify(places.filter((place) => !place.isGeolocation))
  );
}

Place.prototype.toJSON = function () {
  return {
    lat: this.lat,
    lon: this.lon,
    name: this.name,
    options: this.options,
  };
};

function loadPlaces() {
  if (localStorage.getItem("places")) {
    const placesJSON = JSON.parse(localStorage.getItem("places")) ?? [];
    places = placesJSON
      .filter(
        (place) =>
          typeof place.lat === "number" &&
          isFinite(place.lat) &&
          typeof place.lon === "number" &&
          isFinite(place.lon) &&
          typeof place.name === "string" &&
          place.name.length > 0 &&
          typeof place.options === "object"
      )
      .map(
        (place) => new Place(place.lat, place.lon, place.name, place.options)
      );
  } else {
    places = [];
  }
}

function getPlaceByName(name) {
  return places.find((place) => place.name === name);
}

var lastUpdateTime;
const divLastUpdate = dom("#last-update");
function showLastUpdate() {
  if (divLastUpdate) {
    Visibility.every(10 * relativeTime.UNITS.second, () => {
      if (lastUpdateTime) {
        const relativeUpdateTime = relativeTime(lastUpdateTime, {
          minimalUnit: "minute",
          showNow: false,
        });

        if (relativeUpdateTime) {
          divLastUpdate.innerText =
            lang == "de"
              ? relativeUpdateTime + " aktualisiert"
              : "updated " + relativeUpdateTime;
        } else {
          divLastUpdate.innerText = "";
        }
      }
    });
  }
}

function updateLastUpdate(updateTime = new Date()) {
  if (!lastUpdateTime || updateTime > lastUpdateTime)
    // only update if newer
    lastUpdateTime = updateTime;
  showLastUpdate();
}
function updateLastUpdateIfOlder(updateTime = new Date()) {
  if (!lastUpdateTime || updateTime < lastUpdateTime)
    // only update if older
    lastUpdateTime = updateTime;
  showLastUpdate();
}

const getWindIcon = (beaufort, wind_deg) =>
  dom.img({
    style: {
      "transform-origin": "50% 50%",
      transform: "rotate(" + (wind_deg % 360) + "deg)",
    },
    src:
      "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/wind-beaufort-" +
      beaufort +
      ".svg",
  });

const formatMeter = (number) =>
  Math.abs(number) >= 1000
    ? Number.parseFloat((number / 1000).toPrecision(2)) + "km"
    : Number.parseFloat(number.toPrecision(2)) + "m";

const getGeolocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject("Geolocation not supported");
    navigator.geolocation.getCurrentPosition((position) => {
      const roundedLat = Math.round(position.coords.latitude * 100) / 100;
      const roundedLon = Math.round(position.coords.longitude * 100) / 100;
      // coordinates rounded to second decimal are accurate to 1.1km/2
      const accuracy = Math.max(
        position.coords.accuracy,
        distance(
          { lat: roundedLat, lon: roundedLon },
          { lat: position.coords.latitude, lon: position.coords.longitude }
        )
      );
      resolve(
        new Place(
          roundedLat,
          roundedLon,
          lang == "de" ? "Deine Position" : "Your position",
          { isGeolocation: true, accuracy }
        )
      );
    }, reject);
  });

// Code execution

var places = []; // TODO: add user location
loadPlaces();

showLastUpdate();
