const divMain = dom("#main");

const settings = JSON.parse(localStorage.getItem("settings"));

// TODO: sort all function in a more logical way

function createSunPathSection() {
  // TODO: move graph to the right on desktop and show sunrise and sunset (+golden hour maybe) on left as in old version

  const divChart = dom.div();
  const section = dom.section(".section", divChart);
  divMain.appendChild(section);

  const altitudesToday = solarAltitude().map(({ altitude, seconds }) => ({
    x: seconds,
    y: altitude,
  }));

  const sunTimes = SunCalc.getTimes(new Date(), place.lat, place.lon);
  const { summerSolstice, winterSolstice } = getSolsticeDays();

  const altitudesSummerSolstice = summerSolstice
    ? solarAltitude(summerSolstice).map(({ altitude, seconds }) => ({
        x: seconds,
        y: altitude,
      }))
    : [];
  const altitudesWinterSolstice = winterSolstice
    ? solarAltitude(winterSolstice).map(({ altitude, seconds }) => ({
        x: seconds,
        y: altitude,
      }))
    : [];

  const range = altitudesToday.reduce(
    ([min, max], { y }) => [Math.min(min, y), Math.max(max, y)],
    [Infinity, -Infinity]
  );

  const colors = [
    [8, "#ffdb70"],
    [3, "#dcaa34"],
    [-3, "#7e9dcf"],
    [-8, "#5572a1"],
    [-11, "#374358"],
    [-15, "#191919"],
  ];
  const colorStops = colors.map(([angle, color]) => ({
    offset: mapRange(angle * (Math.PI / 180), range, [100, 0]),
    color,
    opacity: 1,
  }));

  const chart = new ApexCharts(divChart, {
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
    colors: ["grey", "grey", "#4a4a4a"],
    series: [
      {
        name: "summerSolstice",
        type: "line",
        data: altitudesSummerSolstice,
      },
      {
        name: "winterSolstice",
        type: "line",
        data: altitudesWinterSolstice,
      },
      {
        name: "today",
        type: "area",
        data: altitudesToday,
      },
    ],
    stroke: {
      curve: "straight",
    },
    fill: {
      type: ["solid", "solid", "gradient"],
      gradient: {
        colorStops: colorStops,
      },
    },
    annotations: {
      position: "back",
      xaxis: [
        {
          x: getSecondsOfDay(new Date()),
          borderColor: "red",
          strokeDashArray: 0,
        },
      ],
    },
    xaxis: {
      show: false,
      type: "numeric",
      labels: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
    },
    grid: {
      show: false,
    },
    yaxis: {
      show: false,
      min: -Math.PI / 2,
      max: Math.PI / 2,
      labels: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
    },
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
  });
  chart.render();
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

  // this doesn't work for point in the Tropical circles
  if (lat < 24) summerSolsticeDay = null;

  return {
    summerSolstice: summerSolsticeDay,
    winterSolstice: winterSolsticeDay,
  };
}

async function createEcmwfSection() {
  const [data_ENS, data_rain] = await Promise.all([
    fetch_json(
      "https://apps.ecmwf.int/webapps/opencharts-api/v1/products/opencharts_meteogram/?lon=" +
        place.lon +
        "&lat=" +
        place.lat
    ),
    fetch_json(
      "https://apps.ecmwf.int/webapps/opencharts-api/v1/products/opencharts_ptype_meteogram/?lon=" +
        place.lon +
        "&lat=" +
        place.lat
    ),
  ]);

  const canvas_ENS = dom.canvas();
  const canvas_rain = dom.canvas();
  const section = dom.section(
    ".section level ecmwf",
    dom.div(".level-item", canvas_rain),
    dom.div(".level-item", canvas_ENS)
  );
  divMain.appendChild(section);

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error());
      image.src = src;
    });

  const [image_rain, image_ENS] = await Promise.all([
    loadImage(data_rain.data.link.href),
    loadImage(data_ENS.data.link.href),
  ]);

  const crop_rain = { left: 273 - 10, top: 207, right: 308 - 10, bottom: 332 };
  const crop_ENS = { left: 83, top: 19, right: 102, bottom: 211 };

  canvas_rain.width = image_rain.width - crop_rain.left - crop_rain.right;
  canvas_rain.height = image_rain.height - crop_rain.top - crop_rain.bottom;
  const ctx_rain = canvas_rain.getContext("2d");
  canvas_ENS.width = image_ENS.width - crop_ENS.left - crop_ENS.right;
  canvas_ENS.height = image_ENS.height - crop_ENS.top - crop_ENS.bottom;
  const ctx_ENS = canvas_ENS.getContext("2d");

  ctx_rain.drawImage(
    image_rain,
    crop_rain.left,
    crop_rain.top,
    canvas_rain.width,
    canvas_rain.height,
    0,
    0,
    canvas_rain.width,
    canvas_rain.height
  );
  ctx_ENS.drawImage(
    image_ENS,
    crop_ENS.left,
    crop_ENS.top,
    canvas_ENS.width,
    canvas_ENS.height,
    0,
    0,
    canvas_ENS.width,
    canvas_ENS.height
  );
}

const addPaddingRange = ([min, max], paddingFactor) => [
  min - (max - min) * paddingFactor,
  max + (max - min) * paddingFactor,
];

function createDaysSection() {
  const section = dom.section(".section");

  divMain.appendChild(section);

  Promise.all([
    promiseOpenweathermap,
    new Promise((resolve, reject) =>
      // show openweathermap even if openMeteo is not available
      promiseOpenMeteo.then(resolve).catch(() =>
        resolve({
          hourly: {
            time: [],
            precipitation: [],
            temperature_2m: [],
            cloudcover_high: [],
            cloudcover_mid: [],
            cloudcover_low: [],
          },
        })
      )
    ),
  ]).then(([openweathermapData, openMeteoData]) => {
    const [minimalTempRange, maximalTempRange] = addPaddingRange(
      openweathermapData.daily.reduce(
        ([min, max], { temp }) => [
          Math.min(min, ...Object.values(temp)),
          Math.max(max, ...Object.values(temp)),
        ],
        [Infinity, -Infinity]
      ),
      0.2
    );
    const tempScale = maximalTempRange - minimalTempRange;

    for (const dayData of openweathermapData.daily) {
      const date = new Date(dayData.dt * 1000);
      const dayString = date.getDate();
      const weekdayString = date.toLocaleDateString([], { weekday: "short" });

      const index_start = openMeteoData.hourly.time.findIndex(
        (dt) => new Date(dt * 1000).getDate() == dayString
      );
      const index_stop =
        openMeteoData.hourly.time.length -
        openMeteoData.hourly.time
          .slice()
          .reverse()
          .findIndex((dt) => new Date(dt * 1000).getDate() == dayString);
      const hasMoreData = index_stop - index_start >= 24;

      const rainData = zip(
        openMeteoData.hourly.precipitation,
        openMeteoData.hourly.time
      )
        .slice(index_start, index_stop + 1)
        .map(([value, time]) => ({
          x: time * 1000,
          y: value,
        }));
      const maxRain = hasMoreData
        ? Math.max(...rainData.map(({ y }) => y))
        : dayData.rain;

      const tempData = zip(
        openMeteoData.hourly.temperature_2m,
        openMeteoData.hourly.time
      )
        .slice(index_start, index_stop + 1)
        .map(([value, time]) => ({
          x: time * 1000,
          y: value,
        }));

      const temperaturesOfTheDay = {
        morn: mean(
          tempData
            .filter(({ x }) => Math.abs(new Date(x).getHours() - 7) <= 2)
            .map(({ y }) => y)
        ),
        day: mean(
          tempData
            .filter(({ x }) => Math.abs(new Date(x).getHours() - 13) <= 2)
            .map(({ y }) => y)
        ),
        eve: mean(
          tempData
            .filter(({ x }) => Math.abs(new Date(x).getHours() - 21) <= 2)
            .map(({ y }) => y)
        ),
        night: mean(
          tempData
            .filter(
              ({ x }) =>
                Math.abs(new Date(x).getHours() - 1) <= 2 ||
                Math.abs(new Date(x).getHours() - 1 - 24) <= 2
            )
            .map(({ y }) => y)
        ),
        min: Math.min(...tempData.map(({ y }) => y)) || dayData.temp.min,
        max: Math.max(...tempData.map(({ y }) => y)) || dayData.temp.max,
      };

      const highTemp = temperaturesOfTheDay.day || dayData.temp.day;
      const lowTemp =
        Math.min(temperaturesOfTheDay.morn, temperaturesOfTheDay.eve) ||
        Math.min(dayData.temp.eve, dayData.temp.morn);

      const leftPercentage = Math.round(
        ((lowTemp - minimalTempRange) / tempScale) * 100
      );
      const widthPercentage = Math.max(
        Math.round(((highTemp - lowTemp) / tempScale) * 100),
        1 // min width is 1% to avoid 0% width
      );
      const rightPercentage = 100 - widthPercentage - leftPercentage;

      const leftExtremePercentage = Math.round(
        ((temperaturesOfTheDay.min - minimalTempRange) / tempScale) * 100
      );
      const widthExtremePercentage = Math.round(
        ((temperaturesOfTheDay.max - temperaturesOfTheDay.min) / tempScale) *
          100
      );

      const cloudsHighData = openMeteoData.hourly.cloudcover_high.slice(
        index_start,
        index_stop + 1
      );
      const cloudsMidData = openMeteoData.hourly.cloudcover_mid.slice(
        index_start,
        index_stop + 1
      );
      const cloudsLowData = openMeteoData.hourly.cloudcover_low.slice(
        index_start,
        index_stop + 1
      );

      let expanded = false;
      let charts;
      const imgExpand = dom.img({
        style: { width: "2rem", transition: "all .3s ease-in-out" },
        src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/chevron-down-outline.svg",
        on: {
          click: () => {
            expanded = !expanded;
            if (expanded) {
              dom(imgExpand, ".flip");
              charts = multiChart(
                tempData,
                cloudsHighData,
                cloudsMidData,
                cloudsLowData,
                rainData
              );
              dom(divCharts, ".box", charts.elements);
              charts.render();
            } else {
              charts.destroy();
              divCharts.innerText = "";
              divCharts.className = "";

              imgExpand.className = "";
            }
          },
        },
      });
      const btnExpand = dom.button(
        ".level-item level-right is-narrow p-1 button is-white",
        hasMoreData ? null : ".is-invisible", // hide button, but keep the space
        imgExpand
      );
      const divCharts = dom.div();

      const divDay = dom.div(
        ".level m-0",
        dom.div(
          ".level-left level is-mobile my-0",
          dom.div(
            ".level-left",
            { style: { marginRight: "3rem" } },
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
            ".level-right is-mobile my-0",
            { style: { margin: "auto" } },
            dom(
              getWindIcon(
                msToBeaufort(dayData.wind_speed),
                dayData.wind_deg + 180
              ),
              ".level-item",
              { style: { width: "3rem" } }
            ),
            dom.img(".level-item", {
              style: { width: "3rem" },
              src:
                "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/uv-index-" +
                Math.min(Math.max(Math.round(dayData.uvi), 1), 11) +
                ".svg",
            }),
            dom.div(
              ".level-item is-centered is-flex is-flex-direction-column",
              dom.img(".level-item", {
                style: { height: "3rem", margin: "-15px" },
                src:
                  maxRain > 1
                    ? "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/raindrop" +
                      (maxRain > 2 ? "s" : "") + // TODO: improve rain amount cut-off and document it
                      ".svg"
                    : "",
              }),
              dom.div(
                ".level-item has-text-grey ml-auto", // has-text-right is-block
                { style: { width: "3rem" } },
                dayData.pop && (dayData.pop * 100).toFixed(0) + "%"
              )
            )
          )
        ),
        dom.div(
          ".level-right level my-0 is-mobile",
          { style: { flexGrow: 1 } },
          dom.div(
            ".tempRange level-left level my-0 is-mobile",
            {
              style: {
                position: "relative",
                flexGrow: 1,
                marginRight: "2rem",
              },
            },
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
              ".level-item my-0 is-block has-text-right px-1",
              {
                style: { position: "absolute", width: leftPercentage + "%" },
              },
              dom.textNode(Math.round(lowTemp) + "°C")
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
              dom.textNode(Math.round(highTemp) + "°C")
            )
          ),
          btnExpand
        )
      );
      section.appendChild(divDay);
      section.appendChild(divCharts);
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

function multiChart(
  tempData,
  cloudsHighData,
  cloudsMidData,
  cloudsLowData,
  rainData,
  { compact = false } = {}
) {
  // TODO: show half of the labels if screen is too small
  // TODO: show wind data and rain in one combined chart
  // TODO: fix color gradient: use true range of data not max-min of axis

  const divChartTemp = dom.div();
  const divTemp = dom.div(
    { style: { position: "relative" } },
    dom.p(
      ".chart-label",
      (compact ? "Feels-like Temperature" : "Temperature") + " (°C)"
    ),
    divChartTemp
  );

  const divChartRain = dom.div();
  const divRain = dom.div(
    { style: { position: "relative" } },
    dom.p(".chart-label", "Rain  (mm/h)"),
    divChartRain
  );

  const divChartCloudsHigh = dom.div();
  const divChartCloudsMid = dom.div();
  const divChartCloudsLow = dom.div();
  const divClouds = dom.div(
    { style: { position: "relative" } },
    dom.p(".chart-label", cloudsLowData ? "Cloudcover" : "Clouds"),
    divChartCloudsHigh,
    divChartCloudsMid,
    divChartCloudsLow
  );

  let tempRange = addPaddingRange(
    tempData.reduce(
      ([min, max], { y }) => [Math.min(min, y), Math.max(max, y)],
      [Infinity, -Infinity]
    ),
    0.2
  );
  tempRange = [Math.floor(tempRange[0]), Math.ceil(tempRange[1])];
  const tempSpan = tempRange[1] - tempRange[0];

  const rainRange = [
    0,
    Math.ceil(Math.max(...rainData.map(({ y }) => (y || 0) * 1.2), 5)),
  ];
  const rainSpan = rainRange[1] - rainRange[0];

  const dates = [
    ...new Set(tempData.map(({ x }) => new Date(x).setHours(12, 0, 0, 0))),
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
  ];

  if (dates.length > 2)
    annotationsXaxis.push(
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
        )
    );

  if (
    new Date() > tempData[1].x &&
    new Date() < tempData[tempData.length - 2].x
  )
    // if "now" is in the visible range and not at the borders
    annotationsXaxis.push({
      x: +new Date(),
      borderColor: "red",
      strokeDashArray: 0,
    });

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

  const maxOffsetBelowZero = colorStops
    .filter((a) => a.offset < 0)
    .reduce((max, { offset }) => Math.max(max, offset), -Infinity);
  const minOffsetAboveOneHundred = colorStops
    .filter((a) => a.offset > 100)
    .reduce((min, { offset }) => Math.min(min, offset), Infinity);
  colorStops = colorStops
    .filter(
      (a) =>
        a.offset >= maxOffsetBelowZero && a.offset <= minOffsetAboveOneHundred
    )
    .sort((a, b) => a.offset - b.offset); // it will not work if not sorted

  const chartTemp = new ApexCharts(divChartTemp, {
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
    aspectRatio: compact ? 1.61 * 2 : 1.61,
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      area: {
        fillTo: "end",
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        colorStops: colorStops,
      },
    },
    colors: ["#4a4a4a"],
    series: [
      {
        name: "temperature",
        type: "area",
        data: tempData,
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
      tickAmount:
        tempData.length == 25 ? tempData.length - 1 : tempData.length / 2,
      labels: {
        formatter: (value, timestamp) => new Date(timestamp).getHours(),
      },
    },
    yaxis: {
      seriesName: "temperature",
      min: tempRange[0],
      max: tempRange[1],
      // between 10 and 20 ticks; if span is bewteen 5 and 40 it will depend on the span and be nicely divisible
      tickAmount:
        tempSpan >= 10
          ? tempSpan <= 20
            ? tempSpan
            : Math.min(tempSpan / 2, 20)
          : Math.max(tempSpan * 2, 10),
      labels: {
        formatter: (value, timestamp) => Math.round(value * 10) / 10,
      },
    },
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
    responsive: [
      {
        breakpoint: 768,
        options: {
          aspectRatio: 1.61,
        },
      },
    ],
  });

  // TODO: show temperature at extremes as annotations

  let chartRain;
  if (!(Math.max(...rainData.map(({ y }) => y)) > 0)) {
    chartRain = { render: () => {}, destroy: () => {} };
    divRain.innerText = ""; // if no rain data, don't show the chart
  } else {
    chartRain = new ApexCharts(divChartRain, {
      chart: {
        type: "bar",
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
      aspectRatio: 1.61 * 2,
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        area: {
          fillTo: "end",
        },
      },
      fill: {
        type: ["solid"],
      },
      colors: ["#2c87c7"],
      series: [
        {
          name: "rain",
          type: "bar",
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
        tickAmount:
          rainData.length == 25 ? rainData.length - 1 : rainData.length / 2,
        labels: {
          formatter: (value, timestamp) => new Date(timestamp).getHours(),
        },
      },
      yaxis: [
        {
          min: rainRange[0],
          max: rainRange[1],
          // between 4 and 8 ticks; if span is bewteen 2 and 16 it will depend on the span and be nicely divisible
          tickAmount:
            rainSpan >= 4
              ? rainSpan <= 8
                ? rainSpan
                : Math.min(rainSpan / 2, 8)
              : Math.max(rainSpan * 2, 4),
          labels: {
            formatter: (value, timestamp) => Math.round(value * 10) / 10,
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
      responsive: [
        {
          breakpoint: 768,
          options: {
            aspectRatio: 1.61,
          },
        },
      ],
    });
  }

  function convertCloudValue(value) {
    // simple mapping
    /* return mapRange(value, [0, 100], [100, 31]); */

    // mapping with one step
    if (value < 10) return 100;
    else return mapRange(value, [10, 100], [100, 31]);

    // mapping onto steps
    /* if (value < 10) return 100;
    else if (value < 25) return 85;
    else if (value < 50) return 60;
    else if (value < 75) return 44;
    else return 31; */
  }

  if (cloudsHighData)
    barChart(
      cloudsHighData.map(
        (value) => "hsl(0deg 0% " + convertCloudValue(value).toFixed(1) + "%) "
      ),
      divChartCloudsHigh
    );
  if (cloudsMidData)
    barChart(
      cloudsMidData.map(
        (value) => "hsl(0deg 0% " + convertCloudValue(value).toFixed(1) + "%) "
      ),
      divChartCloudsMid
    );
  if (cloudsLowData)
    barChart(
      cloudsLowData.map(
        (value) => "hsl(0deg 0% " + convertCloudValue(value).toFixed(1) + "%) "
      ),
      divChartCloudsLow
    );

  return {
    elements: [divTemp, divClouds, divRain],
    render: () => {
      chartTemp.render();
      chartRain.render();
    },
    destroy: () => {
      chartTemp.destroy();
      chartRain.destroy();
    },
  };
}

function barChart(data, div = dom.div()) {
  const backgroundGradient =
    "linear-gradient(90deg, " +
    data
      .map(
        (value, i, arr) =>
          value + " " + ((i / arr.length) * 100).toFixed(1) + "%"
      )
      .join(", ") +
    ")";
  dom(div, {
    style: {
      height: "2rem",
      marginLeft: "2.5rem",
      marginRight: "0.5rem",
      marginBottom: "0.5rem",
      borderRadius: "0.7rem",
      background: backgroundGradient,
    },
  });
  return div;
}

function createForecastHourlySection() {
  const section = dom.section(".section");

  divMain.appendChild(section);

  promiseOpenweathermap.then((openweathermapData) => {
    const feelslikeTempData = openweathermapData.hourly.map((hour) => ({
      x: hour.dt * 1000,
      y: hour.feels_like,
    }));

    const cloudData = openweathermapData.hourly.map((hour) => hour.clouds);

    const charts = multiChart(
      feelslikeTempData,
      cloudData,
      null,
      null,
      [], // no rain
      {
        compact: true,
      }
    );
    const divUV = dom.div();
    dom(
      section,
      charts.elements,
      dom.div(
        { style: { position: "relative" } },
        dom.p(".chart-label", "UV"),
        divUV
      )
    );

    const uvColor = (uv) =>
      uv < 3
        ? "rgba(0,0,0,0)" //"#449512"
        : uv < 6
        ? "#f7e53d"
        : uv < 8
        ? "#f75c38"
        : uv < 11
        ? "#d9362f"
        : "#6e5cc8";

    barChart(
      openweathermapData.hourly.map((hour) => uvColor(hour.uvi)),
      divUV
    );

    charts.render();
  });
}

function createCurrentSection() {
  // TODO: fix chart size
  // TODO: fix too large padding
  // TODO: add minimalistic xaxis (0min,60min)

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

    const moonNames = [
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
      moonNames[Math.round(phase * moonNames.length) % moonNames.length];

    const moonName = getMoonNameFromPhase(moonIllumination.phase);

    // TODO: fix rotationAngle calculation
    const rotationAngle =
      (zenithAngle * 180) / Math.PI +
      (moonIllumination.phase < 0.5 ? 1 : -1) * (90 * (3 / 4)); // add constant angle to take the rotation of the svg into account

    const divChart = dom.div();
    const divCurrent = dom.div(
      ".level",
      dom.div(
        ".level-left level",
        { style: { maxWidth: "50%", margin: "auto" } },
        dom.div(
          ".level-item level is-mobile",
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
          )
        ),

        dom.div(
          ".level-item is-flex is-flex-direction-column",

          dom.div(
            ".level is-mobile my-0",
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
                Math.min(Math.max(Math.round(data.current.uvi), 1), 11) +
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
          ),

          dom.div(
            ".level is-mobile",
            { style: { width: "min-content", margin: "auto" } },
            dom.div(".level-item", dom.textNode(data.current.humidity + "%")),
            dom.img(".level-item", {
              style: { height: "3rem" },
              src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/humidity.svg",
            })
          ),

          dom.div(
            ".level is-mobile",
            { style: { width: "min-content", margin: "auto" } },
            dom.div(
              ".level-item",
              dom.textNode(data.current.pressure + "hBar")
            ),
            dom.img(".level-item", {
              style: { height: "3rem" },
              src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/barometer.svg",
            })
          )
        )
      ),

      dom.div(".level-right", { style: { margin: "auto" } }, divChart)
    );

    section.appendChild(divCurrent);

    const precipitation = data.minutely?.map((minute) => minute.precipitation);
    if (precipitation && Math.max(...precipitation)) {
      const maxPrecipitation = Math.max(...precipitation, 4);

      //TODO: use same chart style as on index.html
      const chart = new ApexCharts(divChart, {
        series: [
          {
            data: precipitation,
          },
        ],
        chart: {
          type: "bar",
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
        //aspectRatio: 1.61 * 2,
        dataLabels: {
          enabled: false,
        },
        plotOptions: {
          bar: {
            borderRadius: 1,
            columnWidth: "100%",
          },
        },
        grid: {
          show: false,
        },
        xaxis: {
          show: false,
          type: "numeric",
          labels: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
        },
        yaxis: {
          show: false,
          min: 0,
          max: maxPrecipitation,
          /* labels: {
            show: false,
          }, */
          /*  axisTicks: {
            show: false,
          }, */
          axisBorder: {
            show: false,
          },
        },
        tooltip: {
          show: false,
          shared: false,
          intersect: true,
          x: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
      });
      chart.render();
    }
  });
}


// TODO: unique id for each section

function createWindySection() {
  divMain.appendChild(
    dom.section(
      ".section",
      dom.iframe({
        style: { width: "100%", height: "50vh" },
        src:
          "https://embed.windy.com/embed2.html?lat=" +
          place.lat +
          "&lon=" +
          place.lon +
          "&detailLat=" +
          place.lat +
          "&detailLon=" +
          place.lon +
          "&width=650&height=450" +
          "&zoom=4&level=surface&overlay=temp&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=bft&metricTemp=%C2%B0C&radarRange=-1",
        frameborder: "0",
      })
    )
  );
}

function createAlertsSection() {
  const section = dom.section(".section");
  divMain.appendChild(section);

  const formatShortDate = (date) =>
    // check if it date is on the same day
    [
      date.toLocaleString("de-DE", { month: "short", day: "numeric" }),
      // also check date minus one millisecond (midnight would count as next day otherwise)
      new Date(+date - 1).toLocaleString("de-DE", {
        month: "short",
        day: "numeric",
      }),
    ].includes(
      new Date().toLocaleString("de-DE", { month: "short", day: "numeric" })
    )
      ? date.toLocaleString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleString("de-DE", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  const getSeverityColorClass = (severity) =>
    [".is-dark", ".is-warning", ".is-danger"][severity];

  promiseOpenweathermap.then((data) => {
    if (!data.alerts?.length) {
      dom(section, ".is-hidden");
      return;
    }
    const alerts = data.alerts.sort((a, b) => getSeverety(b) - getSeverety(a));

    function alertMessage(alert) {
      const startDate = new Date(alert.start * 1000);
      const endDate = new Date(alert.end * 1000);
      const colorClass = getSeverityColorClass(getSeverety(alert));
      // TODO: color of warning symbols on idex.html in same color

      const alertIconsMap = {
        Wind: ["windsock"],
        Thunderstorm: ["wind-alert", "lightning-bolt"],
        Flood: ["tide-high"],
        Rain: ["raindrop-measure"],
      };

      return dom.article(
        ".message",
        colorClass,
        dom.div(
          ".message-header has-text",
          dom.div(
            ".level is-mobile",
            { style: { width: "100%", flexWrap: "wrap" } },
            dom.div(
              ".level-item level-left",
              { style: { hiteSpace: "break-spaces", maxWidth: "100%" } },
              dom.textNode(alert.event)
            ),
            dom.div(
              ".level-item level-right",
              dom.textNode(formatShortDate(startDate)),
              dom.div(
                ".is-inline has-text-grey mx-1",
                " (",
                dom.textNode(
                  relativeTime(startDate, { options: { style: "short" } })
                ),
                ") "
              ),
              " ➔ ",
              dom.textNode(formatShortDate(endDate)),
              dom.div(
                ".is-inline has-text-grey mx-1",
                " (",
                dom.textNode(
                  relativeTime(endDate, { options: { style: "short" } })
                ),
                ") "
              )
            )
          )
        ),
        dom.div(
          ".message-body",
          dom.div(".block", alert.description),
          dom.div(
            ".level",
            dom.div(
              ".level-left",
              dom.div(".level-item has-text-grey", alert.sender_name),

              dom.div(
                ".level-item ml-5",
                { height: "1.5rem" },
                alert.tags.map((tag) =>
                  alertIconsMap[tag].map((icon) =>
                    dom.img({
                      style: { height: "4rem" },
                      src:
                        "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
                        icon +
                        ".svg",
                    })
                  )
                )
              )
            ),

            dom.div(
              ".level-left",
              dom.div(
                ".tags",
                alert.tags.map((tag) =>
                  dom.span(".tag is-rounded", colorClass, dom.textNode(tag))
                )
              )
            )
          )
        )
      );
    }

    if (alerts.length <= 2) {
      alerts.forEach((alert) => {
        dom(section, alertMessage(alert));
      });
    } else {
      let current = 0;
      const paginationLinks = alerts.map((item, index) =>
        dom.a(
          getSeverityColorClass(getSeverety(item)),
          ".pagination-link",
          {
            on: {
              click: () => {
                updateCurrentPage(index);
              },
            },
          },
          index.toString()
        )
      );
      // TODO: swipe gesture
      const previousLink = dom.a(
        ".pagination-previous",
        {
          on: {
            click: () => {
              previousLink.getAttribute("disabled") ??
                updateCurrentPage(current - 1);
            },
          },
        },
        dom.img({
          style: { height: "1rem" },
          src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/chevron-back-outline.svg",
        })
      );
      const nextLink = dom.a(
        ".pagination-next",
        {
          on: {
            click: () => {
              nextLink.getAttribute("disabled") ??
                updateCurrentPage(current + 1);
            },
          },
        },
        dom.img({
          style: { height: "1rem" },
          src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/chevron-forward-outline.svg",
        })
      );
      const alertDiv = dom.div();

      const updateCurrentPage = (newIndex) => {
        current = Math.max(0, Math.min(alerts.length - 1, newIndex));

        if (current === 0) previousLink.setAttribute("disabled", "true");
        else previousLink.removeAttribute("disabled");

        if (current === alerts.length - 1)
          nextLink.setAttribute("disabled", "true");
        else nextLink.removeAttribute("disabled");

        paginationLinks.forEach((item, index) => {
          item.classList.remove("is-current");
          current === index && item.classList.add("is-current");
        });

        alertDiv.replaceChildren(alertMessage(alerts[current]));
      };
      updateCurrentPage(current);

      dom(
        section,
        dom.nav(
          ".pagination is-centered is-rounded is-small",
          {
            role: "navigation",
          },
          previousLink,
          nextLink,
          dom.ul(
            ".pagination-list",
            paginationLinks.map((item) => dom.li(item))
          )
        ),
        alertDiv
      );
    }
  });
}


// Code execution starts here
updateLastUpdate();

var place;

const promiseOpenweathermap = new Deferred();
const promiseOpenMeteo = new Deferred();

async function main() {
  const URLplaceParameter = new URL(location.href).searchParams.get("place"); // TODO: name is not unique
  place = getPlaceByName(URLplaceParameter);
  if (!place) {
    if (URLplaceParameter) location.href = "/";

    try {
      place = await getGeolocation();
    } catch (e) {
      location.href = "/";
    }
  }

  document.title = place.name + " - " + document.title;

  dom(
    "#title",
    (thisEl) => (thisEl.innerText = ""),
    dom.textNode(place.name),
    place.isGeolocation &&
      dom.sup(
        ".is-size-6 mx-3 mb-4 has-text-grey",
        dom.textNode("±" + formatMeter(place.accuracy))
      )
  );

  if (place.isGeolocation)
    fetch_json(
      "https://nominatim.openstreetmap.org/reverse.php?lat=" +
        place.lat +
        "&lon=" +
        place.lon +
        "&zoom=10&format=jsonv2"
    ).then((data) => {
      dom(
        dom("#title").parentElement.parentElement, // select section containg the title
        dom.div(".subtitle", dom.textNode(data.display_name)) // TODO: Fix sometimes display_name is too long
      );
    });

  promiseOpenweathermap.setPromise(openweathermap(place));
  promiseOpenMeteo.setPromise(openMeteo(place));

  Promise.all([promiseOpenweathermap, promiseOpenMeteo]).then(
    ([openweathermapData, openMeteoData]) => {
      updateLastUpdateIfOlder(new Date(openweathermapData.current.dt * 1000));
      const openMeteoUpdateTime = openMeteoData.current_weather.time * 1000;
      if (new Date() - openMeteoUpdateTime > 11 * relativeTime.UNITS.minute)
        // openMeteo date it is only updated every 10min and the current section uses openweathermap anyway
        updateLastUpdateIfOlder(new Date(openMeteoUpdateTime));

      if (!place.timezone) place.timezone = openweathermapData.timezone;
      if (!place.elevation) place.elevation = openMeteoData.elevation;

      savePlaces();
    }
  );

  createCurrentSection();
  createAlertsSection();

  createDaysSection();
  divMain.appendChild(
    dom.section(".section", dom.h2(".subtitle is-2", "Next 48h"))
  );

  createForecastHourlySection();

  // TODO: add rainviewer rain radar map
  // TODO: load rain radar map only if rain in next 60min

  divMain.appendChild(
    dom.section(
      ".section",
      dom.hr(".has-background-grey my-6", {
        style: { borderRadius: "0.2rem", height: "0.2rem" },
      })
    )
  );

  createSunPathSection();
  if (settings.showBandwidthHeavyWidgets) createWindySection();

  // dont show Meteoblue untill it works on mobile
  //if (settings.showBandwidthHeavyWidgets) createMeteoblueSection();
  if (settings.showBandwidthHeavyWidgets) createEcmwfSection();

  // TODO: comment code better
}
main();
