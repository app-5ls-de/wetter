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

function createCityBox(place) {
  const divBox = crel.a({
    class: "box city p-0",
    href:
      "https://wetter.app.5ls.de/show?lat=" + place.lat + "&lon=" + place.lon, // this is only temporarily
    // TODO: add onclick to open detailed weather
  });
  const divColumn = crel.div(
    {
      class: "column is-one-quarter",
    },
    divBox
  );
  divCities.appendChild(divColumn);

  openweathermap(place).then((data) => {
    const divBlock = crel.div({
      class: "block pl-3 pr-3 m-0",
    });
    divBox.appendChild(divBlock);

    const divLevelName = crel.div(
      {
        class: "level pt-3 pb-3",
      },
      crel.h2(
        {
          class: "city-name level-item",
        },
        crel.span(
          {
            class: "is-size-5 has-text-grey",
          },
          place.name //TODO: fix long names (https://dev.to/jankapunkt/make-text-fit-it-s-parent-size-using-javascript-m40)
        ),
        crel.sup(
          // TODO: only show if not all places have same country code
          {
            class: "is-size-7 mb-4 is-uppercase",
          },
          place.countryCode
        )
      )
    );
    divBlock.appendChild(divLevelName);

    const beaufort = msToBeaufort(data.current.wind_speed);
    const weatherCondition = weatherConditionNameFromId(
      data.current.weather[0].id,
      data.current.weather[0].icon
    );
    const wind_deg = data.current.wind_deg + (180 % 360);
    const divLevelIcons2 = crel.div(
      {
        class: "level city-icons is-relative",
      },
      crel.img({
        class: "city-icon2 level-item",
        style: { width: "7rem", left: "0.5rem", top: "-2rem" },
        // alternative: https://www.amcharts.com/free-animated-svg-weather-icons/
        src:
          "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
          weatherCondition +
          ".svg",
        alt: weatherCondition,
      }),
      crel.img({
        class: "city-icon2 level-item",
        style: {
          width: "4rem",
          right: 0,
          top: "-1rem",
          "transform-origin": "50% 50%",
          transform: "rotate(" + wind_deg + "deg)",
        },
        src:
          "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/wind-beaufort-" +
          beaufort +
          ".svg",
        alt: "wind-beaufort-" + beaufort,
      })
    );
    divBlock.appendChild(divLevelIcons2);

    const divLevelTempDay = crel.div(
      {
        class: "level-item mb-0 mr-0 is-size-3 level",
      },
      crel.img({
        class: "city-temp-icon level-item",
        src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg-static/thermometer-warmer.svg",
      }),
      crel.div(
        {
          class: "city-temp has-text-weight-bold level-item",
        },
        data.daily[0].temp.day.toFixed(0),
        crel.div(
          {
            class: "city-temp-celsius mb-4 has-text-grey",
          },
          "°C"
        )
      )
    );
    const divLevelTempNight = crel.div(
      {
        class: "level-item mb-0 mr-0 is-size-3 level",
      },
      crel.img({
        class: "city-temp-icon level-item",
        src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg-static/thermometer-colder.svg",
      }),
      crel.div(
        {
          class: "city-temp has-text-weight-bold level-item",
        },
        data.daily[0].temp.night.toFixed(0),
        crel.div(
          {
            class: "city-temp-celsius mb-4 has-text-grey",
          },
          "°C"
        )
      )
    );
    const divLevelTemp = crel.div(
      {
        class: "level is-mobile",
      },
      crel.div(
        {
          class: "city-temp level-item is-size-1 has-text-weight-bold",
        },
        data.current.temp.toFixed(0),
        crel.div(
          {
            class: "city-temp-celsius mb-4 has-text-grey",
          },
          "°C"
        )
      ),
      crel.div(
        {
          class: "level-right",
        },
        crel.div(divLevelTempDay, divLevelTempNight)
      )
    );
    divBlock.appendChild(divLevelTemp);

    const maxPrecipitation =
      data.minutely?.reduce(
        (acc, cur) => Math.max(acc, cur.precipitation),
        0
      ) ?? 0;
    const maxChartPrecipitation = Math.max(maxPrecipitation, 3);

    // TODO: add whitespace if no precipitation
    if (data.minutely /* && maxPrecipitation */) {
      const divChart = crel.div(
        {
          class: "city-minute level-item",
        },
        crel.table(
          {
            class: "charts-css column",
          },
          (tbodyChart = crel.tbody({
            class: "charts-css column",
          }))
        )
      );
      for (let i = 0; i < data.minutely.length; i++) {
        const size = data.minutely[i].precipitation / maxChartPrecipitation;

        const tr = crel.tr(
          size
            ? crel.td(
                {
                  cssVariable: {
                    size: size.toFixed(2),
                  },
                },
                crel.span(
                  {
                    class: "tooltip",
                  },
                  "in " + i + "min"
                )
              )
            : undefined
        );
        tbodyChart.appendChild(tr);
      }
      divBox.appendChild(divChart);
    }
  });
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

const searchAndDisplay = debounce(_searchAndDisplay, 300);

async function _searchAndDisplay(searchQuery, limit = 5) {
  searchQuery = searchQuery?.trim();
  if (!searchQuery) return;

  const data = await fetch_json(
    "https://photon.komoot.io/api/?q=" +
      searchQuery +
      // TODO: focus on user location with low zoom        // "&lat=49&lon=11&zoom=7" +
      "&lang=en&limit=" +
      limit +
      "&osm_tag=place" // TODO: filter by layer if this pull request is accepted: https://github.com/komoot/photon/pull/667
  );

  // TODO: show distance and direction from user location

  divSearchResults.textContent = "";

  data.features.forEach((element) => {
    const divBox = crel.div(
      {
        class: "box block level is-mobile",
      },
      crel.div(
        {
          class: "level-left",
        },
        crel.div(
          {
            class: "level-item",
          },
          element.properties.name + ", " + element.properties.countrycode //TODO: fix long names
        )
      ),
      crel.div(
        {
          class: "level-right",
        },
        crel.button(
          {
            class: "button level-item is-primary",
            on: {
              click: () => {
                const place = new Place(
                  element.properties.name,
                  element.properties.countrycode,
                  element.geometry.coordinates[1], // lat
                  element.geometry.coordinates[0] // lon
                );

                places.push(place);
                savePlaces();

                createPlaceModalItem(place);
              },
            },
          },
          crel.span(
            {
              class: "icon is-small",
            },
            crel.img({
              class: "icon",
              src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/add-outline.svg",
            })
          )
        )
      )
    );
    divSearchResults.appendChild(divBox);
  });

  if (!data.features) {
    divSearchResults.textContent = "No results found";
    // TODO: show error message
  }

  const divMore = crel.button(
    {
      class: "button",
      on: {
        click: () => {
          searchAndDisplay(searchQuery, limit + 5);
        },
      },
    },
    "show more"
  );
  divSearchResults.appendChild(divMore);
}

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

// Code execution starts here

var places = []; // TODO: add user location
loadPlaces();
