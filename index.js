const divCities = dom("#cities");
const divPlacesList = dom("#places-list");
const divSearchResults = dom("#search-results");
const divSearchButton = dom("#search-button");
const divSearchInput = dom("#search-input");
const divModal = dom("#modal");
const buttonModalOpen = dom("#modal-open");

var settings = Object.assign(
  {
    // default values
    showLocation: true,
    showBandwidthHeavyWidgets: window.innerWidth > 768, // simple way to detect if user is on a mobile device, this does't need to be accurate
  },
  JSON.parse(localStorage.getItem("settings"))
);

async function createAllWidgets() {
  divPlacesList.textContent = "";
  divCities.textContent = "";

  if (settings.showLocation) {
    try {
      const location = await getGeolocation();
      createCityBox(location);
    } catch (e) {
      settings.showLocation = false;
      localStorage.setItem("settings", JSON.stringify(settings));
    }
  }

  for (const place of places) {
    createPlaceModalItem(place);
  }

  for (const place of places) {
    createCityBox(place);
  }

  updateLastUpdate();
}

function createPlaceModalItem(place) {
  const divBox = dom.div(
    ".box block list-group-item level is-mobile",
    dom.div(
      ".level-left",
      dom.img(".icon level-item handle", {
        src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/move-outline.svg",
      })
    ),
    dom.div(
      ".level-item",
      dom.textNode(place.name + ", " + place.countryCode.toUpperCase()) //TODO: fix long names
    ),
    dom.div(
      ".level-right",
      dom.button(
        ".button level-item is-danger",
        {
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
        dom.span(
          ".icon is-small",
          dom.img(".icon", {
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

  localStorage.setItem("settings", JSON.stringify(settings));
}

const searchAndDisplay = debounce(_searchAndDisplay, 300);

async function _searchAndDisplay(searchQuery, limit = 5) {
  searchQuery = searchQuery?.trim();
  if (!searchQuery) return;

  const data = await fetch_json(
    "https://photon.komoot.io/api/?q=" +
      searchQuery +
      // TODO: focus on user location with low zoom        // "&lat=49&lon=11&zoom=7" +
      "&lang=" +
      lang +
      "&limit=" +
      limit +
      "&osm_tag=place" // TODO: filter by layer if this pull request is accepted: https://github.com/komoot/photon/pull/667
  );

  // TODO: show distance and direction from user location

  divSearchResults.textContent = "";

  data.features.forEach((element) => {
    const divBox = dom.div(
      ".box block level is-mobile",
      dom.div(
        ".level-left",
        dom.div(
          ".level-item",
          dom.textNode(
            element.properties.name + ", " + element.properties.country
          ) //TODO: fix long names
        )
      ),
      dom.div(
        ".level-right",
        dom.button(
          ".button level-item is-primary",
          {
            on: {
              click: () => {
                const place = new Place(
                  element.geometry.coordinates[1], // lat
                  element.geometry.coordinates[0], //  lon
                  element.properties.name,
                  {
                    countryCode: element.properties.countrycode.toUpperCase(),
                  }
                );

                places.push(place);
                savePlaces();

                createPlaceModalItem(place);
                divSearchResults.textContent = "";
                divSearchInput.value = "";
              },
            },
          },
          dom.span(
            ".icon is-small",
            dom.img(".icon", {
              src: "https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/svg/add-outline.svg",
            })
          )
        )
      )
    );
    divSearchResults.appendChild(divBox);
  });

  if (!data.features) {
    divSearchResults.innerText =
      lang == "de" ? "Keine Ergebnisse gefunden" : "No results found";
    // TODO: show error message
  }

  const divMore = dom.button(
    ".button",
    {
      on: {
        click: () => {
          searchAndDisplay(searchQuery, limit + 5);
        },
      },
    },
    dom.textNode(lang == "de" ? "mehr anzeigen" : "show more")
  );
  divSearchResults.appendChild(divMore);
}

function createCityBox(place) {
  const divBox = dom.a(".box city p-0", {
    href: "/show" + (place.isGeolocation ? "" : "?place=" + place.name),
    style: { minWidth: "300px" },
  });
  const divColumn = dom.div(
    ".column",
    { style: { maxWidth: "400px" } },
    divBox
  );
  divCities.appendChild(divColumn);

  openweathermap(place).then((data) => {
    updateLastUpdateIfOlder(new Date(data.current.dt * 1000));
    const divBlock = dom.div(".block pl-3 pr-3 m-0");
    divBox.appendChild(divBlock);

    const divLevelName = dom.div(
      ".level pt-3 pb-3",
      dom.h2(
        ".city-name level-item",
        dom.span(
          ".has-text-grey",
          place.name.length < 20
            ? ".is-size-5"
            : place.name.length < 25
            ? ".is-size-6"
            : ".is-size-7",
          dom.textNode(
            place.name.length < 29 ? place.name : place.name.slice(0, 29) + "…"
          )
        ),
        place.isGeolocation
          ? dom.sup(
              ".is-size-7 mb-4",
              dom.textNode("±" + formatMeter(place.accuracy))
            )
          : place.countryCode &&
              new Set(places.map((p) => p.countryCode)).size > 1 && // only show if not all places have same country code
              dom.sup(".is-size-7 mb-4", dom.textNode(place.countryCode))
      )
    );
    divBlock.appendChild(divLevelName);

    const weatherCondition = weatherConditionNameFromId(
      data.current.weather[0].id,
      data.current.weather[0].icon
    );
    const divLevelIcons = dom.div(
      ".level city-icons is-relative",
      dom.img(".city-icon2 level-item", {
        style: { width: "7rem", left: "0.5rem", top: "-2rem" },
        // alternative: https://www.amcharts.com/free-animated-svg-weather-icons/
        src:
          "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/" +
          weatherCondition +
          ".svg",
      }),
      data.alerts?.length &&
        dom.img(".city-icon2 level-item", {
          style: { width: "3rem", left: "50%", transform: "translateX(-50%)" },
          src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/code-yellow.svg",
        }),
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
      )
    );
    divBlock.appendChild(divLevelIcons);

    const divLevelTempDay = dom.div(
      ".level-item mb-0 mr-0 is-size-3 level",
      dom.img(".city-temp-icon level-item", {
        src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg-static/thermometer-warmer.svg",
      }),
      dom.div(
        ".city-temp has-text-weight-bold level-item",
        dom.textNode(data.daily[0].temp.day.toFixed(0)),
        dom.div(".city-temp-celsius mb-4 has-text-grey", "°C")
      )
    );
    const divLevelTempNight = dom.div(
      ".level-item mb-0 mr-0 is-size-3 level",
      dom.img(".city-temp-icon level-item", {
        src: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg-static/thermometer-colder.svg",
      }),
      dom.div(
        ".city-temp has-text-weight-bold level-item",
        dom.textNode(data.daily[0].temp.night.toFixed(0)),
        dom.div(".city-temp-celsius mb-4 has-text-grey", "°C")
      )
    );
    const divLevelTemp = dom.div(
      ".level is-mobile",
      dom.div(
        ".city-temp level-item is-size-1 has-text-weight-bold",
        dom.textNode(data.current.temp.toFixed(0)),
        dom.div(".city-temp-celsius mb-4 has-text-grey", "°C")
      ),
      dom.div(".level-right", dom.div(divLevelTempDay, divLevelTempNight))
    );
    divBlock.appendChild(divLevelTemp);

    // TODO: use new charting library for precipitation

    const maxPrecipitation =
      data.minutely?.reduce(
        (acc, cur) => Math.max(acc, cur.precipitation),
        0
      ) ?? 0;
    const maxChartPrecipitation = Math.max(maxPrecipitation, 3);

    // TODO: add whitespace if no precipitation
    if (data.minutely /* && maxPrecipitation */) {
      const divChart = dom.div(
        ".city-minute level-item",
        dom.table(
          ".charts-css column",
          (tbodyChart = dom.tbody(".charts-css column"))
        )
      );
      for (let i = 0; i < data.minutely.length; i++) {
        const size = data.minutely[i].precipitation / maxChartPrecipitation;

        const tr = dom.tr(
          size
            ? dom.td(
                {
                  cssVariable: {
                    size: size.toFixed(2),
                  },
                },
                dom.span(".tooltip", "in " + i + "min")
              )
            : undefined
        );
        tbodyChart.appendChild(tr);
      }
      divBox.appendChild(divChart);
    }
  });
}

// Code execution starts here
if (lang == "de") {
  divModal.getElementsByClassName("title")[0].innerText = "Wetter";
  divSearchInput.placeholder = "Suchen um hinzuzufügen";
}

buttonModalOpen.addEventListener("click", () => {
  divModal.classList.add("is-active");
});

[dom("#modal-close"), dom("#modal-background")].forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

if (!places.length) {
  const divColumn = dom.div(
    ".column",
    dom.p(
      ".city is-size-1 is-primary",
      lang == "de" ? "Stadt hinzufügen" : "Add city",
      dom.img(".arrow", {
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

    // swap places at oldIndex and newIndex
    [places[e.oldIndex], places[e.newIndex]] = [
      places[e.newIndex],
      places[e.oldIndex],
    ];
    savePlaces();
  },
});

dom(
  "#switch-geolocation",
  (thisEl) => {
    thisEl.checked = settings.showLocation;
  },
  {
    on: {
      change: function () {
        settings.showLocation = this.checked;
        localStorage.setItem("settings", JSON.stringify(settings));
      },
    },
  }
);

dom(
  "#switch-bandwidthHeavy",
  (thisEl) => {
    thisEl.checked = settings.showBandwidthHeavyWidgets;
  },
  {
    on: {
      change: function () {
        settings.showBandwidthHeavyWidgets = this.checked;
        localStorage.setItem("settings", JSON.stringify(settings));
      },
    },
  }
);

async function main() {
  createAllWidgets();
}
main();
