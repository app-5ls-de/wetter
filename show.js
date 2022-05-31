const divMain = crel("#main");

function createSunPathSection() {
  const section = crel.section(
    {
      class: "section",
    },
    (divChart = crel.div({
      class: "ct-chart ct-perfect-fourth",
    }))
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

// Code execution starts here

const place = getPlaceByName(new URL(location.href).searchParams.get("place"));
// TODO: name is not unique

if (!place) {
  // TODO: use user location
  location.href = "index.html";
}

createSunPathSection();
