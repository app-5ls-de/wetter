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

// Code execution starts here

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
