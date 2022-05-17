const divCities = crel("#cities");
const divPlacesList = crel("#places-list");
const divSearchResults = crel("#search-results");
const divSearchButton = crel("#search-button");
const divSearchInput = crel("#search-input");

var places = []; // TODO: add user location

loadPlaces();

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
  document
    .getElementsByClassName("js-modal-trigger")[0]
    .classList.add("is-primary");
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

for (const place of places) {
  createPlaceModalItem(place);
}

for (const place of places) {
  createCityBox(place);
}
