const divCities = crel("#cities");
const divPlacesList = crel("#places-list");
const divSearchResults = crel("#search-results");
const divSearchButton = crel("#search-button");
const divSearchInput = crel("#search-input");
const divModal = crel("#modal");
const buttonModalOpen = crel("#modal-open");

function createAllWidgets() {
  divPlacesList.textContent = "";
  divCities.textContent = "";

  for (const place of places) {
    createPlaceModalItem(place);
  }

  for (const place of places) {
    createCityBox(place);
  }
}

function createPlaceModalItem(place) {
  const getExpandedIcon = (isExpanded) =>
    isExpanded
      ? "https://www.svgrepo.com/show/238205/minimize.svg"
      : "https://www.svgrepo.com/show/238207/expand.svg";

  const divBox = crel.div(
    {
      class: "box block list-group-item level is-mobile",
    },
    crel.div(
      {
        class: "level-left",
      },
      crel.img({
        class: "icon level-item handle",
        src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/move-outline.svg",
      })
    ),
    crel.div(
      {
        class: "level-item",
      },
      place.name + ", " + place.countryCode.toUpperCase() //TODO: fix long names
    ),
    crel.div(
      {
        class: "level-right",
      },
      crel.button(
        {
          class: "button level-item is-hidden", // TODO: implement expanded and remove is-hidden
          on: {
            click: () => {
              place.expanded = !place.expanded;
              imgExpanded.src = getExpandedIcon(place.expanded);
              savePlaces();
            },
          },
        },
        crel.span(
          {
            class: "icon is-small",
          },
          (imgExpanded = crel.img({
            class: "icon",
            src: getExpandedIcon(place.expanded),
          }))
        )
      ),
      crel.button(
        {
          class: "button level-item is-danger",
          on: {
            click: () => {
              const index = places.indexOf(place);
              places.splice(index, 1);
              divBox.remove();
              savePlaces();
              removeCache();
            },
          },
        },
        crel.span(
          {
            class: "icon is-small",
          },
          crel.img({
            class: "icon",
            src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/close-outline.svg",
          })
        )
      )
    )
  );
  divPlacesList.appendChild(divBox);
}

function closeModal() {
  divModal.classList.remove("is-active");
  divSearchResults.textContent = "";
  divSearchInput.value = "";
  createAllWidgets();
}

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

function createCityBox(place) {
  const divBox = crel.a({
    class: "box city p-0",
    href: debug
      ? "/show?place=" + place.name
      : "https://wetter.app.5ls.de/show?lat=" + place.lat + "&lon=" + place.lon,
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

// Code execution

buttonModalOpen.addEventListener("click", () => {
  divModal.classList.add("is-active");
});

[crel("#modal-close"), crel("#modal-background")].forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

createAllWidgets();

if (!places.length) {
  const divColumn = crel.div(
    {
      class: "column",
    },
    crel.p(
      {
        class: "city is-size-1 is-primary",
      },
      "Add city",
      crel.img({
        class: "arrow",
        src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/arrow-forward-outline.svg",
      })
    )
  );
  divCities.appendChild(divColumn);
  buttonModalOpen.classList.add("is-primary");
  buttonModalOpen.addEventListener("click", () => {
    buttonModalOpen.classList.remove("is-primary");
  });
}

divSearchButton.addEventListener("click", () => {
  searchAndDisplay(divSearchInput.value);
});
divSearchInput.addEventListener("input", () => {
  searchAndDisplay(divSearchInput.value);
});

Sortable.create(divPlacesList, {
  handle: ".handle",
  animation: 150,
  ghostClass: "has-background-info",
  onEnd: (e) => {
    if (e.oldIndex == e.newIndex) return;

    [places[e.oldIndex], places[e.newIndex]] = [
      places[e.newIndex],
      places[e.oldIndex],
    ];
    savePlaces();
  },
});
