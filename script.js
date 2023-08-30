"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  click() {
    ++this.clicks;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type.replace(
      this.type[0],
      this.type[0].toUpperCase()
    )} on ${new Intl.DateTimeFormat(navigator.locale, {
      month: "long",
      day: "2-digit",
    }).format(this.date)}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h

    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Application Architecture

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  validateInputs(...inputs) {
    return inputs.every((inp) => !isNaN(+inp) && +inp > 0);
  }

  constructor() {
    // get position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // Attcah Event Handler
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Error");
      }
    );
  }

  _loadMap(position) {
    const {
      coords: { longitude, latitude },
    } = position;
    // console.log(
    //   `https://www.google.com/maps/@${latitude},${longitude},14z?entry=ttu`
    // );
    this.#map = L.map("map").setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling click on the map
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(e) {
    inputDistance.focus();
    this.#mapEvent = e;
    form.classList.remove("hidden");
  }

  _hideForm() {
    // clear inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    // Hide form
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout((_) => (form.style.display = "grid"), 1000);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "cycling" ? "🚴‍♀️" : "🏃"} ${workout.description}`
      )
      .openPopup();
  }

  _newWorkout(e) {
    // prevent form from its default behaviour to see results !!
    e.preventDefault();

    // get input type (cycling - running)
    const type = inputType.value;

    // get input values of the fields
    const distance = inputDistance.value;
    const duration = inputDuration.value;

    let workout;
    const {
      latlng: { lat, lng },
    } = this.#mapEvent;

    // check type of Workout
    if (!this.validateInputs(distance, duration)) {
      alert("Error");
      return;
    }

    // Add running Workout
    if (type === "running") {
      const cadence = inputCadence.value;
      if (!this.validateInputs(cadence)) return alert("Error");
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // Add cycling Workout
    else if (type === "cycling") {
      const elevation = inputElevation.value;
      if (!this.validateInputs(elevation)) return alert("Error");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add workout object to the array
    this.#workouts.push(workout);

    // Diplay marker on the clicked location
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // Hide form
    this._hideForm();

    // Set local storage to all worlouts
    this._setLocalStorage();
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "cycling" ? "🚴‍♀️" : "🏃"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
  `;

    if (workout.type === "running") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦵</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">m</span>
          </div>
      </li>`;
    }
    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${+workout.speed.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🚴‍♀️</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
    </li>`;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // // using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

new App();

class Person {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
  sayHello() {
    console.log("Hello " + this.name);
  }
  get name() {
    return this._name;
  }
  set name(newName) {
    this._name = newName;
  }
}

class student extends Person {
  constructor(name, id, level) {
    super(name, id);
    this.level = level;
    super.sayHello();
  }
  sayHello() {
    console.log("Hello " + this.name + " from child");
  }
}

const s1 = new student("Ibrahim", 21661201901000612, 4);
console.log(s1.name);
