/**
 * Fetches street/road geometry from OpenStreetMap so the frontend can render
 * streets around the theatres
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const STREETS_PATH = new URL("../data/streets.json", import.meta.url);

const PADDING_DEGREES = 0.003;

// Compute a bounding box for map containing all theatres, with padding
function getPaddedBounds(theatres) {
  const lats = theatres.map((t) => t.lat);
  const lngs = theatres.map((t) => t.lng);

  return {
    minLat: Math.min(...lats) - PADDING_DEGREES,
    maxLat: Math.max(...lats) + PADDING_DEGREES,
    minLng: Math.min(...lngs) - PADDING_DEGREES,
    maxLng: Math.max(...lngs) + PADDING_DEGREES,
  };
}

/**
 * Queries the Overpass API for streets within that bounding box
 *  - Build an overpass QL query string
 *  - POSTs that query
 *  - Returns the parses JSON response
 */
async function fetchStreets(bounds) {
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"^(primary|secondary|tertiary|residential|pedestrian|living_street)$"]
        (${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
    );
    out geom;
  `;

  const response = await fetch(
    "https://overpass.kumi.systems/api/interpreter",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent":
          "west-end-map-learning-project/1.0 (your-email@example.com)",
      },
      body: `data=${encodeURIComponent(query)}`,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Overpass API returned ${response.status}: ${body}`);
  }

  return response.json();
}

/**
 * Reads and parses theatres.json
 * Computes the bounding box
 * Call fetchStreets(bounds) to get raw Overpass data
 * Process this data
 * Write this to streets.json
 */
async function main() {
  const theatresRaw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(theatresRaw);

  const bounds = getPaddedBounds(theatres);
  console.log("Fetching streets for bounds:", bounds);

  const data = await fetchStreets(bounds);

  const ways = data.elements
    .filter((el) => el.type === "way" && el.geometry)
    .map((el) => ({
      highway: el.tags?.highway || "unknown",
      points: el.geometry.map((pt) => [pt.lat, pt.lon]),
    }));

  const output = { bounds, ways };
  await fs.writeFile(STREETS_PATH, JSON.stringify(output));
  console.log(`Saved ${ways.length} street segments to streets.json`);
}

main();
