const divCities = crel("#cities");

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

const places = [new Place("Aarhus", "dk", 56.16, 10.21)];

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

async function openweathermap(place) {
  const cacheID = place.lat + "," + place.lon;
  if (localStorage.getItem(cacheID))
    return JSON.parse(localStorage.getItem(cacheID));
  // TODO: invalidate cache after ~1h

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
          place.name
        ),
        crel.sup(
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
          "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg/" +
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
          "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg/wind-beaufort-" +
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
        src: "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg-static/thermometer-warmer.svg",
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
        src: "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg-static/thermometer-colder.svg",
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

for (const place of places) {
  createCityBox(place);
}
