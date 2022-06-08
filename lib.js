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

function Place(name, countryCode, lat, lon) {
  this.name = name;
  this.countryCode = countryCode;
  this.lat = lat;
  this.lon = lon;
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
  localStorage.setItem("places", JSON.stringify(places));
}

function loadPlaces() {
  if (localStorage.getItem("places")) {
    const placesJSON = JSON.parse(localStorage.getItem("places")) ?? [];
    places = placesJSON.map(
      (place) => new Place(place.name, place.countryCode, place.lat, place.lon)
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
  if (divLastUpdate)
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

function updateLastUpdate() {
  lastUpdateTime = new Date();
  showLastUpdate();
}

// Code execution

var places = []; // TODO: add user location
loadPlaces();

showLastUpdate();
