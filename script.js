const divCities = crel("#cities");

async function fetch_json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  return data;
}

crel.attrMap["cssVariable"] = (element, value) => {
  for (let varName in value) {
    if (Object.hasOwnProperty.call(value, varName)) {
      element.style.setProperty("--" + varName, value[varName]);
    }
  }
};

async function openweathermap(lat = 50, lon = 10) {
  const apiKey = "4fbc2ce2fc600e6" + /*  */ "e450dd4bbde8f28be";
  const data = await fetch_json(
    "https://api.openweathermap.org/data/2.5/onecall?lat=" +
      lat +
      "&lon=" +
      lon +
      "&appid=" +
      apiKey
  );
  return data;
}

function createCityBox() {
  const divColumn = crel.div(
    {
      class: "column is-one-quarter",
    },
    (divBox = crel.a({
      class: "box city p-0",
    }))
  );
  divCities.appendChild(divColumn);

  // fetch data

  const divBlock = crel.div({
    class: "block pl-3 pr-3 m-0",
  });
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
        "Ulm"
      ),
      crel.sup(
        {
          class: "is-size-7 mb-4 is-uppercase",
        },
        "de"
      )
    )
  );
  divBlock.appendChild(divLevelName);

  const divLevelIcons2 = crel.div(
    {
      class: "level city-icons is-relative",
    },
    crel.img({
      class: "city-icon2 level-item",
      style: { width: "7rem", left: "0.5rem", top: "-2rem" },
      src: "https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/rainy-1.svg",
      alt: "rainy-1",
    }),
    crel.img({
      class: "city-icon2 level-item",
      style: { width: "4rem", right: 0, top: "-1rem" },
      src: "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg/wind-beaufort-1.svg",
      alt: "wind-beaufort-1",
    })
  );
  divBlock.appendChild(divLevelIcons2);

  const divLevelTempMax = crel.div(
    {
      class: "level-item mb-0 mr-0 is-size-3 level",
    },
    crel.img({
      class: "city-temp-icon level-item",
      src: "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg-static/thermometer-warmer.svg",
      alt: "thermometer-warmer",
    }),
    crel.div(
      {
        class: "city-temp has-text-weight-bold level-item",
      },
      "23",
      crel.div(
        {
          class: "city-temp-celsius mb-4 has-text-grey",
        },
        "°C"
      )
    )
  );
  const divLevelTempMin = crel.div(
    {
      class: "level-item mb-0 mr-0 is-size-3 level",
    },
    crel.img({
      class: "city-temp-icon level-item",
      src: "https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg-static/thermometer-colder.svg",
      alt: "thermometer-colder",
    }),
    crel.div(
      {
        class: "city-temp has-text-weight-bold level-item",
      },
      "12",
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
      "18",
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
      crel.div(divLevelTempMax, divLevelTempMin)
    )
  );
  divBlock.appendChild(divLevelTemp);

  divBox.appendChild(divBlock);

  const isRain = Math.random() > 0.2 ? 1 : 0;

  if (isRain) {
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
    for (let i = 0; i < 60; i++) {
      let size = Math.cos(((2 * i) / 100) * 2 * Math.PI + Math.random() * 0.7);
      size = Math.max(0, size) * isRain;
      const tr = crel.tr(
        crel.td(
          {
            cssVariable: {
              size: size.toFixed(2),
            },
          },
          size
            ? crel.span(
                {
                  class: "tooltip",
                },
                "in " + i + "min"
              )
            : undefined
        )
      );
      tbodyChart.appendChild(tr);
    }
    divBox.appendChild(divChart);
  }
}

createCityBox();
