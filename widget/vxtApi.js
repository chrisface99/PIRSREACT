import { CONFIG, IATA_TO_CITY_MAPPING } from "./config.js";

class VxtApiManager {
  updateToken(token) {
    if (typeof token === "string") {
      CONFIG.AVIATIONSTACK_API_KEY = token;
    }
  }
    updateIata(iataCodeCity) {
    if (typeof iataCodeCity === "string") {
      CONFIG.iataCodeCity = iataCodeCity;
    }
  }
  constructor(tickerManager, flightTableManager, weatherService) {
    this.tickerManager = tickerManager;
    this.flightTableManager = flightTableManager;
    this.weatherService = weatherService;
    this.iataCodeCity = null;
    this.airportLocation = null;
    this.userPrompt = null;
  }

  processUserInput(rawPrompt) {
    let prompt = rawPrompt.replaceAll(" ", "");
    if (prompt && prompt !== this.userPrompt) {
      this.updateAirportCode(prompt);
      this.userPrompt = prompt;
    }
  }

  updateAirportCode(selectedCode) {
    if (IATA_TO_CITY_MAPPING[selectedCode]) {
      this.iataCodeCity = selectedCode;
      this.airportLocation = IATA_TO_CITY_MAPPING[selectedCode];
      document.getElementById("airport-code").textContent = this.iataCodeCity;
      this.weatherService.updateLocalWeather(this.airportLocation);
    } else {
      console.warn(`Unknown IATA code: ${selectedCode}`);
    }
  }

    updateTemplate(template) {
    const departuresSection = document.getElementById("departures-section");
    const arrivalsSection = document.getElementById("arrivals-section");

    if (!departuresSection || !arrivalsSection) return;

    if (template === "flightScheduleMain") {
      departuresSection.style.display = "";
      arrivalsSection.style.display = "";
    } else if (template === "flightScheduleDepartures") {
      departuresSection.style.display = "";
      arrivalsSection.style.display = "none";
    } else if (template === "flightScheduleArrivals") {
      departuresSection.style.display = "none";
      arrivalsSection.style.display = "";
    }
  }

  createChannel() {
    const channel = $vxt.createChannel($vxtSubChannelId);

    channel.subscribe("config", (response) => {
      console.log(response);
      if (response.data && response.data.Configuration) {
        const config = response.data.Configuration;
        console.log('[vxtApi] config.iataCodeCity:', config.iataCodeCity);

        if (config.iataCodeCity) {
          this.updateAirportCode(config.iataCodeCity);
          this.iataCodeCity = config.iataCodeCity;
          this.updateIata(config.iataCodeCity);
        }

        if (config.Token) {
          this.Token = config.Token;
          this.updateToken(config.Token);
        }

        if (window.flightService && typeof window.flightService.updateFromConfig === 'function') {
          window.flightService.updateFromConfig(config);
        }

        this.tickerManager.updateConfiguration(config);

        if (config.rowsCount) {
          this.flightTableManager.setRowsCount(config.rowsCount);
        }

        let template = "flightScheduleMain";
        if (Array.isArray(config)) {
          const templateConfig = config.find(c => c.id === "template");
          if (templateConfig && templateConfig.value) {
            template = templateConfig.value;
          }
        } else if (config.template) {
          template = config.template;
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            this.updateTemplate(template);
          });
        } else {
          this.updateTemplate(template);
        }

        this.flightTableManager.updateTableDisplay();
      }
    });

    channel.subscribe("playstate", (response) => console.log(response.type));
    channel.subscribe("vxtstate", (response) => console.log(response.type));

    console.log("[WiNE API] channel created", $vxtSubChannelId);
  }

  waitForVxtApi() {
    const interval = setInterval(() => {
      if (window.$vxt) {
        clearInterval(interval);
        this.createChannel();
      }
    }, 100);
  }

initialize() {
  this.waitForVxtApi();
}
}

export default VxtApiManager;
