const divCities = crel("#cities");
const divPlacesList = crel("#places-list");
const divSearchResults = crel("#search-results");
const divSearchButton = crel("#search-button");
const divSearchInput = crel("#search-input");

loadPlaces();

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
