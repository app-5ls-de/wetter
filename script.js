const divCities = crel("#cities");
const divPlacesList = crel("#places-list");
const divSearchResults = crel("#search-results");
const divSearchButton = crel("#search-button");
const divSearchInput = crel("#search-input");
const divModal = crel("#modal");
const buttonModalOpen = crel("#modal-open");

buttonModalOpen.addEventListener("click", () => {
  divModal.classList.add("is-active");
});

function closeModal() {
  divModal.classList.remove("is-active");
  createAllWidgets();
}

[crel("#modal-close"), crel("#modal-background")].forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

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

createAllWidgets();
