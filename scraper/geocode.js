/**
 * Take each theatre's street address and looks up longtitude/latitude via
 * LocationIQ geocoding API, writing coordinates back to theatres/json
 *
 * Geocoding step: convert street addresses into lat/long coords so theatres
 * can be plotted on a map
 */

// Loads environment from a .env file
import "dotenv/config";
import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const API_KEY = process.env.LOCATIONIQ_API_KEY;

if (!API_KEY) {
  throw new Error("Missing LOCATIONIQ_API_KEY: check your .env file");
}

// Promise-based delay helper to pace requests
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds a LocationIQ search URL, URL-encoding the address, requesting JSON format and limit=1 (the best match)
 * Fetches it.
 * Parses the JSON. LocationIQ returns an array of matches
 * If array empty (no match found), returns null
 * Otherwise, returns {lat, long}
 */
async function geocode(address) {
  const url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `LocationIQ returned ${response.status} for "${address}": ${body}`
    );
  }

  const results = await response.json();

  if (results.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };
}

/**
 * Reads and parses theatres.json
 * Loops through each theatre:
 *  - Logs which theatre is being geocoded
 *  - Calls geocode(theatre.address)
 * Write the whole updated theatres array back to theatres.json
 */
async function main() {
  const raw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(raw);

  for (const theatre of theatres) {
    console.log(`Geocoding ${theatre.name}...`);

    try {
      const coords = await geocode(theatre.address);

      if (coords) {
        theatre.lat = coords.lat;
        theatre.lng = coords.lng;
      } else {
        console.warn(
          `No match found for ${theatre.name} - leaving lat/lng as null`
        );
      }
    } catch (err) {
      console.error(`Failed to geocode ${theatre.name}:`, err.message);
      if (err.cause) {
        console.error("Cause: ", err.cause);
      }
    }

    await sleep(600);
  }

  await fs.writeFile(THEATRES_PATH, JSON.stringify(theatres, null, 2));
  console.log("Done. theatres.json updated.");
}

main();
