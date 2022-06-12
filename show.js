const divMain = dom("#main");

function createSunPathSection() {
  // TODO: move graph to the right on desktop and show sunrise and sunset on left as in old version
  // TODO: use new charting library

  const divChart = dom.div(".ct-chart ct-perfect-fourth");
  const section = dom.section(".section", divChart);

  const altitudesToday = solarAltitude().map(({ altitude, seconds }) => ({
    x: seconds,
    y: altitude,
  }));

  const sunTimes = SunCalc.getTimes(new Date(), place.lat, place.lon);
  const { summerSolstice, winterSolstice } = getSolsticeDays();

  const altitudesSummerSolstice = solarAltitude(summerSolstice).map(
    ({ altitude, seconds }) => ({
      x: seconds,
      y: altitude,
    })
  );
  const altitudesWinterSolstice = solarAltitude(winterSolstice).map(
    ({ altitude, seconds }) => ({
      x: seconds,
      y: altitude,
    })
  );

  new Chartist.Line(
    divChart,
    {
      series: [
        {
          name: "summerSolstice",
          className: "series-solstice",
          data: altitudesSummerSolstice,
        },
        {
          name: "winterSolstice",
          className: "series-solstice",
          data: altitudesWinterSolstice,
        },
        {
          name: "today",
          className: "series-today",
          data: altitudesToday,
        },
      ],
    },
    {
      low: -Math.PI / 2,
      high: Math.PI / 2,
      axisX: {
        type: Chartist.FixedScaleAxis,
        labelInterpolationFnc: (seconds) =>
          new Date(
            new Date().setHours(0, 0, 0, 0) + seconds * 1000
          ).toLocaleTimeString(["en-GB", "de"], {
            hour: "numeric",
            minute: "2-digit",
          }),
        ticks: [
          getSecondsOfDay(sunTimes.sunrise),
          getSecondsOfDay(sunTimes.solarNoon),
          getSecondsOfDay(sunTimes.sunset),
          getSecondsOfDay(sunTimes.nadir),
        ].filter((x) => x), // remove invalid dates
      },
      axisY: {
        showLabel: false,
        low: -Math.PI / 2,
        high: Math.PI / 2,
        type: Chartist.FixedScaleAxis,
        ticks: [0],
      },
      lineSmooth: Chartist.Interpolation.monotoneCubic(),
      showPoint: false,
      series: {
        summerSolstice: {
          //showArea: true,
        },
        winterSolstice: {
          //showArea: true,
        },
        today: {
          showArea: true,
        },
      },
    }
  );

  divMain.appendChild(section);
}

const addMinutes = (date, minutes) =>
  date.setMinutes(date.getMinutes() + minutes);
const addDays = (date, days) => date.setDate(date.getDate() + days);
const getSecondsOfDay = (date) =>
  Math.floor((date - new Date(date).setHours(0, 0, 0, 0)) / 1000);

function solarAltitude(day = new Date(), lat = place.lat, lon = place.lon) {
  let loop = new Date(day);
  loop.setHours(0, 0, 0, 0);
  const startDate = loop.getDate();

  let altitudes = [];
  while (loop.getDate() == startDate) {
    const altitude = SunCalc.getPosition(loop, lat, lon).altitude;
    altitudes.push({ altitude, date: loop, seconds: getSecondsOfDay(loop) });

    addMinutes(loop, 15);
  }

  return altitudes;
}

function getSolsticeDays(year = new Date(), lat = place.lat, lon = place.lon) {
  let loop = new Date(year);
  loop.setMonth(0, 1);
  loop.setHours(12, 0, 0, 0); // set to noon
  const startYear = loop.getFullYear();

  let summerSolsticeDay,
    winterSolsticeDay,
    summerSolsticeAltitude,
    winterSolsticeAltitude;
  while (loop.getFullYear() == startYear) {
    const solarNoon = SunCalc.getTimes(loop, lat, lon).solarNoon;
    const altitude = SunCalc.getPosition(solarNoon, lat, lon).altitude;

    if (
      summerSolsticeAltitude === undefined ||
      altitude > summerSolsticeAltitude
    ) {
      summerSolsticeDay = new Date(loop);
      summerSolsticeAltitude = altitude;
    }

    if (
      winterSolsticeAltitude === undefined ||
      altitude < winterSolsticeAltitude
    ) {
      winterSolsticeDay = new Date(loop);
      winterSolsticeAltitude = altitude;
    }

    addDays(loop, 1);
  }

  return {
    summerSolstice: summerSolsticeDay,
    winterSolstice: winterSolsticeDay,
  };
}

async function createEcmwfSection_plume() {
  // TODO: show the two ecmwf meteograms side by side on desktop

  const data = await fetch_json(
    "https://apps.ecmwf.int/webapps/opencharts-api/v1/products/opencharts_meteogram/?epsgram=classical_plume&lon=" +
      place.lon +
      "&lat=" +
      place.lat
  );

  const section = dom.section(
    ".section",
    dom.div(
      { style: { overflow: "hidden", width: "fit-content" } },
      dom.img({
        src: data.data.link.href,
        style: { margin: "-13% -8% -55% -8%" },
      })
    )
  );

  divMain.appendChild(section);
}

async function createEcmwfSection_meteogram() {
  const data = await fetch_json(
    "https://apps.ecmwf.int/webapps/opencharts-api/v1/products/opencharts_ptype_meteogram/?lon=" +
      place.lon +
      "&lat=" +
      place.lat
  );

  const section = dom.section(
    ".section",
    dom.div(
      { style: { overflow: "hidden", width: "fit-content" } },
      dom.img({
        src: data.data.link.href,
        style: { margin: "-16% -12% -16%" },
      })
    )
  );

  divMain.appendChild(section);
}

const addPaddingRange = ([min, max], paddingFactor) => [
  min - (max - min) * paddingFactor,
  max + (max - min) * paddingFactor,
];

function createDaysSection() {
  const section = dom.section(".section");

  divMain.appendChild(section);

  promiseOpenweathermap.then((data) => {
    const [minimalTemp, maximalTemp] = addPaddingRange(
      data.daily.reduce(
        ([min, max], { temp }) => [
          Math.min(min, ...Object.values(temp)),
          Math.max(max, ...Object.values(temp)),
        ],
        [Infinity, -Infinity]
      ),
      0.2
    );
    const tempScale = maximalTemp - minimalTemp;

    for (const dayData of data.daily) {
      const date = new Date(dayData.dt * 1000);
      const dayString = date.getDate();
      const weekdayString = date.toLocaleDateString([], { weekday: "short" });

      const leftPercentage = Math.round(
        ((dayData.temp.night - minimalTemp) / tempScale) * 100
      );
      const widthPercentage = Math.max(
        Math.round(((dayData.temp.day - dayData.temp.night) / tempScale) * 100),
        1 // min width is 1% to avoid 0% width
      );
      const rightPercentage = 100 - widthPercentage - leftPercentage;

      const leftExtremePercentage = Math.round(
        ((dayData.temp.min - minimalTemp) / tempScale) * 100
      );
      const widthExtremePercentage = Math.round(
        ((dayData.temp.max - dayData.temp.min) / tempScale) * 100
      );

      const divDay = dom.div(
        ".level m-0",
        dom.div(
          ".level-left",
          dom.div(
            ".level-item is-centered is-flex is-flex-direction-column",
            { style: { width: "3rem" } },
            dom.div(".has-text-grey", weekdayString),
            dom.div(".has-text-weight-bold", dayString.toString())
          ),
          dom.img(".level-item", {
            style: { width: "4rem" },
            src:
              "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
              weatherConditionNameFromId(
                dayData.weather[0].id,
                dayData.weather[0].icon
              ) +
              ".svg",
          })
        ),
        dom.div(
          ".level m-0",
          dom(
            getWindIcon(
              msToBeaufort(data.current.wind_speed),
              data.current.wind_deg + 180
            ),
            ".level-item",
            { style: { width: "3rem" } }
          ),
          dom.img(".level-item", {
            style: { width: "3rem" },
            src:
              "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/uv-index-" +
              Math.max(Math.round(dayData.uvi), 1) +
              ".svg",
          }),
          dom.div(
            ".level-item is-centered is-flex is-flex-direction-column",
            dom.img(".level-item", {
              style: { height: "3rem", margin: "-15px" },
              src: dayData.rain
                ? "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/raindrop" +
                  (dayData.rain > 1 ? "s" : "") + // TODO: improve rain amount cut-off and document it
                  ".svg"
                : "",
            }),
            dom.div(
              ".level-item has-text-grey ml-auto", // has-text-right is-block
              { style: { width: "3rem" } },
              dayData.pop && (dayData.pop * 100).toFixed(0) + "%"
            )
          )
        ),
        dom.div(
          ".level-right",
          { style: { width: "50%" } },
          dom.div(
            ".tempRange level m-0",
            { style: { width: "100%", position: "relative" } },
            dom.div(".has-background-grey-lighter", {
              style: {
                marginLeft: leftExtremePercentage + "%",
                width: widthExtremePercentage + "%",
                height: "0.1rem",
                borderRadius: "0.1rem",
                position: "absolute",
              },
            }),
            dom.span(
              ".level-item m-0 is-block has-text-right px-1",
              { style: { position: "absolute", width: leftPercentage + "%" } },
              dom.textNode(Math.round(dayData.temp.night) + "°C")
            ),
            dom.div(".has-background-grey-dark", {
              style: {
                marginLeft: leftPercentage + "%",
                width: widthPercentage + "%",
                height: "1rem",
                borderRadius: "1rem",
                position: "absolute",
              },
            }),

            dom.span(
              ".level-item m-0 is-block has-text-left px-1",
              {
                style: {
                  position: "absolute",
                  right: "0",
                  width: rightPercentage + "%",
                },
              },
              dom.textNode(Math.round(dayData.temp.day) + "°C")
            )
          ),

          dom.img(".level-item p-1 is-hidden", {
            style: { width: "2rem" },
            src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/chevron-down-outline.svg",
          })
          /* dom.img(".level-item", {
            style: { width: "1.2rem" } ,
            src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/chevron-up-outline.svg",
          }) */
        )
      );
      section.appendChild(divDay);
      section.appendChild(dom.hr(".my-1", { style: { height: "1px" } }));
    }
  });
}

function createMeteoblueSection() {
  // TODO: don't show if no rain today (use data from openweathermap)

  const section = dom.section(
    ".section",
    dom.iframe({
      src:
        "https://www.meteoblue.com/en/weather/maps/widget/?windAnimation=1&gust=0&satellite=0&cloudsAndPrecipitation=0&cloudsAndPrecipitation=1&temperature=0&temperature=1&sunshine=0&extremeForecastIndex=0&extremeForecastIndex=1&geoloc=fixed&tempunit=C&windunit=bft&lengthunit=metric&zoom=6&autowidth=auto#coords=7/" +
        place.lat +
        "/" +
        place.lon +
        "&map=cloudsAndPrecipitation~hourly~auto~sfc~windAnimationOverlay",
      frameborder: "0",
      scrolling: "no",
      allowtransparency: "true",
      sandbox:
        "allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads",
      style: {
        width: "100%",
        height: "720px",
      },
    }),
    dom.div(
      dom.a(
        {
          href: "https://www.meteoblue.com/en/weather/maps/?utm_source=weather_widget&utm_medium=linkus&utm_content=map&utm_campaign=Weather%2BWidget",
          target: "_blank",
          rel: "noopener",
        },
        "meteoblue"
      )
    )
  );

  divMain.appendChild(section);
}

const mapRange = (x, [in_min, in_max], [out_min, out_max]) =>
  ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;


function createForecastHourlySection() {
  const divChartTemp = dom.div();
  const divChartCloudsHigh = dom.div();
  const divChartCloudsMid = dom.div();
  const divChartCloudsLow = dom.div();
  const divChartRain = dom.div();
  const section = dom.section(
    ".section",
    divChartTemp,
    divChartCloudsHigh,
    divChartCloudsMid,
    divChartCloudsLow,
    divChartRain
  );

  divMain.appendChild(section);

  Promise.all([promiseOpenweathermap, promiseOpenMeteo]).then(
    ([openweathermapData, openMeteoData]) => {
      //console.log(openweathermapData, openMeteoData);

      const rainData = openweathermapData.hourly.map((hour) => ({
        x: hour.dt * 1000,
        y: hour.rain?.["1h"],
      }));
      const rainRange = [
        0,
        Math.ceil(Math.max(...rainData.map((hour) => (hour.y || 0) * 1.2), 5)),
      ];

      const tempData = openweathermapData.hourly.map((hour) => ({
        x: hour.dt * 1000,
        y: hour.temp,
      }));
      let tempRange = addPaddingRange(
        tempData.reduce(
          ([min, max], { y }) => [Math.min(min, y), Math.max(max, y)],
          [Infinity, -Infinity]
        ),
        0.2
      );
      tempRange = [Math.floor(tempRange[0]), Math.ceil(tempRange[1])];

      const index_start = openMeteoData.hourly.time.findIndex(
        (dt) => dt * 1000 >= rainData[0].x
      );
      const index_stop = openMeteoData.hourly.time.findIndex(
        (dt) => dt * 1000 >= rainData[rainData.length - 1].x
      );
      const cloudsHighData = openMeteoData.hourly.cloudcover_high.slice(
        index_start,
        index_stop + 1
      );
      const cloudsMidRange = openMeteoData.hourly.cloudcover_mid.slice(
        index_start,
        index_stop + 1
      );
      const cloudsLowRange = openMeteoData.hourly.cloudcover_low.slice(
        index_start,
        index_stop + 1
      );

      const dates = [
        ...new Set(
          openweathermapData.hourly.map((hour) =>
            new Date(hour.dt * 1000).setHours(12, 0, 0, 0)
          )
        ),
      ];

      const annotationsXaxis = [
        // yellow background to indicate daytime
        ...dates.map((date) => {
          const { sunrise, sunset } = SunCalc.getTimes(
            new Date(date),
            place.lat,
            place.lon
          );
          return {
            x: +sunrise,
            x2: +sunset,
            fillColor: "#e8ec68",
          };
        }),

        // show date on the top of each day
        ...dates
          .map((date) => ({
            x: new Date(date).setHours(12, 0, 0, 0),
            borderColor: "rgba(0,0,0,0);",
            label: {
              borderColor: "white",
              orientation: "horizontal",
              text:
                new Date(date).toLocaleDateString([], { weekday: "short" }) +
                " " +
                new Date(date).getDate(),
            },
          }))
          .filter(
            // dont show date if is not in the visible range
            (annotation) =>
              annotation.x > tempData[0].x &&
              annotation.x < tempData[tempData.length - 1].x
          ),
      ];

      const colorstemp = [
        [48, "#aa354d"], // and above
        [46, "#c44579"],
        [44, "#de58a3"],
        [42, "#f16bce"],
        [40, "#f45081"],
        [38, "#f54937"],
        [36, "#f63f37"],
        [34, "#f97239"],
        [32, "#fa853a"],
        [30, "#f9a53b"],
        [28, "#fdbd3d"],
        [26, "#fdd53e"],
        [24, "#f9e53e"],
        [22, "#fcec3f"],
        [20, "#def3b4"],
        [18, "#beea5a"],
        [16, "#94d959"],
        [14, "#63b456"],
        [12, "#3a8e54"],
        [10, "#54957d"],
        [8, "#4ec696"],
        [6, "#5dd46f"],
        [4, "#68e976"],
        [2, "#65ec97"], // 0 to 2
        [0, "#b3eef9"], // -2 to 0
        [-2, "#99e6f9"],
        [-4, "#74d5fb"],
        [-6, "#69c1f8"],
        [-8, "#5da3f1"],
        [-10, "#5080e8"],
        [-12, "#4b65df"],
        [-14, "#5163d9"],
        [-16, "#8268e0"],
        [-18, "#a66ee8"],
        [-20, "#c372e9"],
        [-22, "#db71e4"],
        [-24, "#b75cb9"],
        [-26, "#964da0"],
        [-28, "#783f87"],
        [-30, "#5e3b71"],
        [-32, "#5e3b71"],

        [-35, "#556891"],
        [-40, "#517a9f"],
        [-45, "#4d8cac"],
        [-50, "#499eb9"],
        [-55, "#44b1c7"],
        [-60, "#40c4d5"],
        [-65, "#3fd7e2"],
        [-70, "#49ecf1"],
        [-75, "#50f9fb"], // and below
      ];

      let colorStops = colorstemp.map(([temperature, color]) => ({
        offset: mapRange(temperature, tempRange, [100, 0]),
        color,
        opacity: 1,
      }));

      let maxOffsetBelowZero = colorStops
        .filter((a) => a.offset < 0)
        .reduce((max, { offset }) => Math.max(max, offset), -Infinity);
      let minOffsetAboveOneHundred = colorStops
        .filter((a) => a.offset > 100)
        .reduce((min, { offset }) => Math.min(min, offset), Infinity);
      colorStops = colorStops
        .filter(
          (a) =>
            a.offset >= maxOffsetBelowZero &&
            a.offset <= minOffsetAboveOneHundred
        )
        .sort((a, b) => a.offset - b.offset); // it will not work if not sorted

      const options = {
        chart: {
          type: "area",
          toolbar: {
            show: false,
          },
          zoom: {
            enabled: false,
          },
          animations: {
            enabled: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        plotOptions: {
          area: {
            fillTo: "end",
          },
        },
        fill: {
          type: ["gradient", "solid"],
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            colorStops: colorStops,
          },
        },
        colors: ["#4a4a4a", "#2c87c7"],
        series: [
          {
            name: "temperature",
            type: "area",
            data: tempData,
          },
          {
            name: "rain",
            type: "column",
            data: rainData,
          },
        ],
        stroke: {
          curve: "straight",
        },
        annotations: {
          position: "back",
          xaxis: annotationsXaxis,
        },
        xaxis: {
          type: "datetime",
          tickAmount: tempData.length / 2,
          labels: {
            /**
             * @param { String } value - The default value generated
             * @param { Number } timestamp - In a datetime series, this is the raw timestamp
             * @param { object } contains dateFormatter for datetime x-axis
             */
            formatter: function (value, timestamp, opts) {
              return new Date(timestamp).getHours();
            },
          },
        },
        yaxis: [
          {
            seriesName: "temperature",
            min: tempRange[0],
            max: tempRange[1],
            title: {
              text: "Temperature (°C)",
            },
          },
          {
            opposite: true,
            seriesName: "rain",
            min: rainRange[0],
            max: rainRange[1],
            title: {
              text: "Rain  (mm/h)",
            },
          },
        ],
        tooltip: {
          shared: false,
          intersect: true,
          x: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
      };

      const chart = new ApexCharts(divChartTemp, options);
      // TODO: show clouds from openMeteo as bar chart with gradient
      // TODO: show temperature at extremes as annotations

      chart.render();
    }
  );
}

function createCurrentSection() {
  // TODO: first section should be a summary of the current weather (icon, temperature, wind, uvindex and graph of precipitation in next 60 minutes)

  const section = dom.section(".section");
  divMain.appendChild(section);

  promiseOpenweathermap.then((data) => {
    const weatherCondition = weatherConditionNameFromId(
      data.current.weather[0].id,
      data.current.weather[0].icon
    );

    const { parallacticAngle: moonParallacticAngle } = SunCalc.getMoonPosition(
      new Date(),
      place.lat,
      place.lon
    );
    const moonIllumination = SunCalc.getMoonIllumination(new Date());
    const zenithAngle = moonIllumination.angle - moonParallacticAngle;

    let moonNames = [
      "moon-new",
      "moon-waxing-crescent",
      "moon-first-quarter",
      "moon-waxing-gibbous",
      "moon-full",
      "moon-waning-gibbous",
      "moon-last-quarter",
      "moon-waning-crescent",
    ];

    const getMoonNameFromPhase = (phase) =>
      moonNames[
        Math.floor(
          //TODO: use Math.round and don't add 1 / (moonNames.length * 2) to get same result
          ((phase + 1 / (moonNames.length * 2)) % 1) * moonNames.length
        )
      ];

    const moonName = getMoonNameFromPhase(moonIllumination.phase);

    const rotationAngle =
      (zenithAngle * 180) / Math.PI +
      ((moonIllumination.phase < 0.5 ? 1 : -1) * 90 * 3) / 4; // add constant angle to take the rotation of the svg into account

    const divChart = dom.div();
    const divCurrent = dom.div(
      ".level",

      dom.div(
        ".level-left",
        dom.img(".level-item", {
          style: { width: "7rem" },
          src:
            "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
            weatherCondition +
            ".svg",
        }),
        dom.div(
          ".city-temp level-item is-size-1 has-text-weight-bold",
          dom.textNode(data.current.temp.toFixed(0)),
          dom.div(".city-temp-celsius mb-4 has-text-grey", "°C")
        ),

        dom.div(
          ".is-flex is-flex-direction-column",
          dom(
            getWindIcon(
              msToBeaufort(data.current.wind_speed),
              data.current.wind_deg + 180
            ),
            ".city-icon2 level-item",
            {
              style: {
                width: "4rem",
                right: 0,
                top: "-1rem",
              },
            }
          ),
          dom.img(".level-item", {
            style: { width: "3rem" },
            src:
              "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/uv-index-" +
              Math.max(Math.round(data.current.uvi), 1) +
              ".svg",
          }),
          dom.img(".level-item", {
            style: {
              width: "6rem",
              "transform-origin": "50% 50%",
              transform: "rotate(" + rotationAngle + "deg)",
            },
            src:
              "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
              moonName +
              ".svg",
          })
        )
      ),

      dom.div(
        ".is-flex is-flex-direction-column",

        dom.div(
          ".level",
          dom.div(".level-item", dom.textNode(data.current.humidity + "%")),
          dom.img(".level-item", {
            style: { width: "3rem" },
            src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/humidity.svg",
          })
        ),

        dom.div(
          ".level",
          dom.div(".level-item", dom.textNode(data.current.pressure + "hBar")),
          dom.img(".level-item", {
            style: { width: "3rem" },
            src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/barometer.svg",
          })
        )
      ),

      dom.div(".level-right", divChart)
    );

    section.appendChild(divCurrent);
  });
}

// Code execution starts here

const place = getPlaceByName(new URL(location.href).searchParams.get("place"));
// TODO: name is not unique

if (!place) {
  // TODO: use user location
  location.href = "index.html";
}
document.title = place.name + " - " + document.title;
document.getElementById("title").innerText = place.name;

const promiseOpenweathermap = openweathermap(place);
const promiseOpenMeteo = openMeteo(place);

createCurrentSection();

createDaysSection();
createForecastHourlySection();

if (!debug) createMeteoblueSection();

divMain.appendChild(
  dom.section(
    ".section",
    dom.hr(".has-background-grey my-6", {
      style: { borderRadius: "0.2rem", height: "0.2rem" },
    })
  )
);

createSunPathSection();

// TODO: comment code better

if (!debug) createEcmwfSection_meteogram();
if (!debug) createEcmwfSection_plume();
