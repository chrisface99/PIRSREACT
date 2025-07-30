class TickerManager {
  constructor() {
    this.userTicker = "Welcome to the Airport Flight Information System!";
    this.userTickerDirection = "left";
    this.flightStatusUpdates = [];
    this.showDefaultTicker = true;
    this.userTickerSpeed = 60;
    this.userTickerFrequency = 20;
    this.showUserTicker = true;
  }

createTicker() {
  if (document.getElementById("ticker")) return;

  const ticker = document.createElement("div");
  ticker.id = "ticker";
  ticker.innerHTML = `<span id="ticker-text">${this.userTicker}</span>`;
  document.body.appendChild(ticker);

  const tickerText = document.getElementById("ticker-text");

  setTimeout(() => {
    let position =
      this.userTickerDirection === "left"
        ? window.innerWidth
        : -tickerText.offsetWidth;

    const animate = () => {
      if (this.userTickerDirection === "left") {
        position -= this.userTickerSpeed / 10;
        if (position < -tickerText.offsetWidth) {
          position = window.innerWidth;
          this.updateTickerText();
          setTimeout(() => {
            position = window.innerWidth;
          }, 0);
        }
      } else {
        position += this.userTickerSpeed / 10;
        if (position > window.innerWidth) {
          position = -tickerText.offsetWidth;
          this.updateTickerText();
          setTimeout(() => {
            position = -tickerText.offsetWidth;
          }, 0);
        }
      }
      tickerText.style.transform = `translateX(${position}px)`;
      requestAnimationFrame(animate);
    };

    animate();
  }, 0);
}

  updateTickerText() {
    if (this.showDefaultTicker && this.flightStatusUpdates.length > 0) {
      if (this.showUserTicker) {
        document.getElementById("ticker-text").textContent = this.userTicker;
      } else {
        const latestUpdate = this.flightStatusUpdates.shift();
        this.flightStatusUpdates.push(latestUpdate);
        document.getElementById("ticker-text").textContent = latestUpdate;
      }
      this.showUserTicker = !this.showUserTicker;
    } else {
      document.getElementById("ticker-text").textContent = this.userTicker;
    }
  }

  addFlightStatusUpdate(flight, type) {
    const flightNumber = flight.flight.iataNumber || flight.flight.icaoNumber || flight.flight.number || "N/A";
    const status = (flight.status || "N/A").toLowerCase();
    const scheduledTime = new Date(flight[type].scheduledTime || flight[type].scheduled).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    let estimatedTime = "";
    if (flight[type].estimatedTime) {
      estimatedTime = new Date(flight[type].estimatedTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    let cityIata = flight[type === "departure" ? "arrival" : "departure"].iataCode || flight[type === "departure" ? "arrival" : "departure"].iata || "Unknown";
    let airportName = cityIata;
    try {
      let mapping = undefined;
      if (typeof IATA_CITY_MAPPING !== 'undefined') {
        mapping = IATA_CITY_MAPPING;
      } else if (globalThis.IATA_CITY_MAPPING) {
        mapping = globalThis.IATA_CITY_MAPPING;
      }
      if (mapping) {
        const found = mapping.find((entry) => entry.iata === cityIata);
        if (found) airportName = found.city;
      }
    } catch (e) {}

    let msg = `Flight ${flightNumber} ${type === "departure" ? "to" : "from"} ${airportName} scheduled at ${scheduledTime}`;
    if (estimatedTime && estimatedTime !== scheduledTime) {
      msg += ` is delayed and will depart at ${estimatedTime}.`;
    } else if (status === "cancelled") {
      msg += ` has been cancelled.`;
    } else if (status === "landed") {
      msg += ` has landed.`;
    } else if (status === "active") {
      msg += ` is now active.`;
    } else if (status === "scheduled") {
      msg += ` is scheduled.`;
    } else {
      msg += ` is ${status}.`;
    }
    this.flightStatusUpdates.push(msg);
  }

  updateConfiguration(config) {
    if (config.inputuserTickerText) {
      this.userTicker = config.inputuserTickerText;
      document.getElementById("ticker-text").textContent = this.userTicker;
    }

    if (config.userTickerDirection) {
      this.userTickerDirection = config.userTickerDirection;
    }

    if (config.userTickerSpeed) {
      this.userTickerSpeed = config.userTickerSpeed;
    }

    if (config.userTickerFrequency) {
      this.userTickerFrequency = config.userTickerFrequency;
    }

    if (config.showDefaultTicker !== undefined) {
      this.showDefaultTicker = config.showDefaultTicker === "true";
    }
  }
}

export default TickerManager;
