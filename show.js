const divMain = dom("#main");

function createSunPathSection() {
  const section = dom.section(
    ".section",
    (divChart = dom.div(".ct-chart ct-perfect-fourth"))
  );

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

  dataOpenweathermap.then((data) => {
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
      const widthPercentage = Math.round(
        ((dayData.temp.day - dayData.temp.night) / tempScale) * 100
      );
      const rightPercentage = 100 - widthPercentage - leftPercentage;

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
              Math.round(dayData.uvi) +
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
            dom.span(
              ".level-item m-0 is-block has-text-right px-1",
              { style: { position: "absolute", width: leftPercentage + "%" } },
              dom.textNode(Math.round(dayData.temp.night) + "°C")
            ),
            dom.div(".bar has-background-grey-dark", {
              style: {
                marginLeft: leftPercentage + "%",
                width: widthPercentage + "%",
                height: "1rem",
                borderRadius: "1rem",
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

// Code execution starts here

const place = getPlaceByName(new URL(location.href).searchParams.get("place"));
// TODO: name is not unique

if (!place) {
  // TODO: use user location
  location.href = "index.html";
}
document.title = place.name + " - " + document.title;
document.getElementById("title").innerText = place.name;

const dataOpenweathermap = openweathermap(place);

createDaysSection();

createSunPathSection();

createEcmwfSection_meteogram();
createEcmwfSection_plume();
