import {
  getCityNameFromIATA,
  formatFlightTime,
  isUpcomingFlight,
  sortFlightsByTime,
} from "./utils.js";
import FlightService from "./flightService.js";

class FlightTableManager {
  constructor(tickerManager) {
    this.flightService = new FlightService();
    this.tickerManager = tickerManager;
    this.departureTableBody = document.querySelector("#departure-table tbody");
    this.arrivalTableBody = document.querySelector("#arrival-table tbody");
    this.gateCache = {};
  }

  setRowsCount(count) {
    this.rowsCount = count;
  }

  async updateDepartureTable(flights) {
    const currentTime = new Date();
    let upcomingFlights = flights.filter((flight) =>
      isUpcomingFlight(flight.departure.scheduledTime)
    );

    if (upcomingFlights.length === 0) {
      upcomingFlights = [...flights];
    }

    upcomingFlights = sortFlightsByTime(upcomingFlights, "departure");
    this.departureTableBody.innerHTML = "";

    const uniqueFlights = [];
    const seenFlightNo = new Set();

    for (const flight of upcomingFlights) {
      if (uniqueFlights.length >= this.rowsCount) break;
      if (seenFlightNo.has(flight.flight.iataNumber.toUpperCase()) || !!flight.codeshared) continue;

      const flightTime = formatFlightTime(flight.departure.scheduledTime);
      const estimatedTime = flight.departure.estimatedTime ? formatFlightTime(flight.departure.estimatedTime) : "-";

      const iataCode =
        flight.arrival && flight.arrival.iataCode
          ? flight.arrival.iataCode
          : "Unknown";
      const destinationCity = getCityNameFromIATA(iataCode);

      const airlineCode =
        flight.airline && flight.airline.iataCode
          ? flight.airline.iataCode
          : "XX";
      const airlineIcon = await this.flightService.fetchAirlineIcon(
        airlineCode
      );

      if (flight.departure.gate) {
        this.gateCache[flight.flight.iataNumber] = flight.departure.gate;
      } else {
        this.gateCache[flight.flight.iataNumber] = null;
      }

      let gate = this.gateCache[flight.flight.iataNumber];
      if (gate === null || gate === undefined) {
        gate = "Soon";
      }
      let status = flight.status || "N/A";
      let statusDisplay = status;
      let statusClass = status.toLowerCase().replace(/\s/g, "-");
      if (flight.departure.delay) {
        status = "delayed";
        statusDisplay = "delayed";
        statusClass = "delayed";
      }

      const row = document.createElement("tr");
      const rowIndex = uniqueFlights.length;
      row.className = rowIndex % 2 === 0 ? "flight-row-even" : "flight-row-odd";
      row.innerHTML = `
    <td>${flightTime}</td>
    <td>${destinationCity} (${iataCode})</td>
    <td>
      <img src="${airlineIcon}" alt="${airlineCode}" class="airline-icon">
      ${flight.flight.iataNumber || flight.flight.icaoNumber || flight.flight.number || "N/A"}
    </td>
    <td>${gate}</td>
    <td class="status-cell ${statusClass}">${statusDisplay}</td>
    <td>${estimatedTime}</td>
  `;

      this.departureTableBody.appendChild(row);
      uniqueFlights.push(flight);
      seenFlightNo.add(flight.flight.iataNumber.toUpperCase());
      this.tickerManager.addFlightStatusUpdate(flight, "departure");
    }
  }

  async updateArrivalTable() {
    const flights = await this.flightService.fetchArrivals();

    const now = Date.now();
    let validFlights = flights.filter(f => {
      if (!f.arrival || !f.arrival.scheduled) return false;
      const sched = new Date(f.arrival.scheduled).getTime();
      return sched >= now;
    });
    validFlights.sort((a, b) => {
      const tA = new Date(a.arrival.scheduled).getTime();
      const tB = new Date(b.arrival.scheduled).getTime();
      return tA - tB;
    });
    this.arrivalTableBody.innerHTML = "";
    const uniqueFlights = [];
    for (const flight of validFlights) {
      if (uniqueFlights.length >= this.rowsCount) break;
      // Always display the scheduled arrival time in TIME column, and estimated in ESTIMATED column
      const flightTime = (flight.arrival && flight.arrival.scheduled) ? formatFlightTime(flight.arrival.scheduled, true) : "-";
      const estimatedTime = (flight.arrival && flight.arrival.estimated) ? formatFlightTime(flight.arrival.estimated, true) : "-";
      const iataCode = flight.departure && flight.departure.iata ? flight.departure.iata : "Unknown";
      const departureCity = getCityNameFromIATA(iataCode);
      const airlineCode = flight.airline && flight.airline.iata ? flight.airline.iata : "XX";
      const airlineIcon = await this.flightService.fetchAirlineIcon(airlineCode);
      let gate = flight.arrival && flight.arrival.gate ? flight.arrival.gate : "Soon";
      let status = flight.flight_status || "N/A";
      let statusDisplay = status;
      let statusClass = status.toLowerCase().replace(/\s/g, "-");
      if (flight.arrival && flight.arrival.delay) {
        status = "delayed";
        statusDisplay = "delayed";
        statusClass = "delayed";
      }
      const row = document.createElement("tr");
      const rowIndex = uniqueFlights.length;
      row.className = rowIndex % 2 === 0 ? "flight-row-even" : "flight-row-odd";
      row.innerHTML = `
        <td>${flightTime}</td>
        <td>${departureCity} (${iataCode})</td>
        <td>
          <img src="${airlineIcon}" alt="${airlineCode}" class="airline-icon">
          ${(flight.flight && (flight.flight.iata || flight.flight.iataNumber || flight.flight.number)) || "N/A"}
        </td>
        <td>${gate}</td>
        <td class="status-cell ${statusClass}">${statusDisplay}</td>
        <td>${estimatedTime}</td>
      `;
      this.arrivalTableBody.appendChild(row);
      uniqueFlights.push(flight);
      this.tickerManager.addFlightStatusUpdate(flight, "arrival");
    }
  }

  async updateTableDisplay() {
    const departures = await this.flightService.fetchFlights();
    console.log("Fetched flight data:", departures);
    await this.updateDepartureTable(departures);
    await this.updateArrivalTable();
  }
}

export default FlightTableManager;
