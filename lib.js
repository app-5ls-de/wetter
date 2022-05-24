const debug =
  location.hostname == "localhost" || location.hostname == "127.0.0.1";

async function fetch_json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  return data;
}

function Place(name, countryCode, lat, lon, expanded = false) {
  this.name = name;
  this.countryCode = countryCode;
  this.lat = lat;
  this.lon = lon;
  this.expanded = expanded;
}

crel.attrMap["cssVariable"] = (element, value) => {
  for (let varName in value) {
    if (Object.hasOwnProperty.call(value, varName)) {
      element.style.setProperty("--" + varName, value[varName]);
    }
  }
};

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

async function openweathermap(place) {
  const cacheID =
    cachePrefix + "-openweathermap-" + place.lat + "," + place.lon;
  if (localStorage.getItem(cacheID)) {
    const cachedData = JSON.parse(localStorage.getItem(cacheID));

    if (debug) return cachedData;

    const cachedTimestamp = new Date(cachedData.current.dt * 1000);
    const diverenceInMinutes = (new Date() - cachedTimestamp) / 1000 / 60;
    if (diverenceInMinutes < 5) {
      return cachedData;
    }
  }

  const apiKey =
    "4fbc2ce2fc600e6" + /* if you're a bot, fuck off */ "e450dd4bbde8f28be";
  const data = await fetch_json(
    "https://api.openweathermap.org/data/2.5/onecall?units=metric&lang=en&lat=" +
      place.lat +
      "&lon=" +
      place.lon +
      "&appid=" +
      apiKey
  );
  localStorage.setItem(cacheID, JSON.stringify(data));
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
      (place) =>
        new Place(
          place.name,
          place.countryCode,
          place.lat,
          place.lon,
          place.expanded
        )
    );
  } else {
    places = [];
  }
}

function getPlaceByName(name) {
  return places.find((place) => place.name === name);
}

// Code execution

var places = []; // TODO: add user location
loadPlaces();
