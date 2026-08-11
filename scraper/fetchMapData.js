/**
 * Fetches street/road geometry, water features, and park/green-space
 * geometry from OpenStreetMap so the frontend can render a full stylized
 * map around the theatres, not just roads
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/mapData.json", import.meta.url);

const PADDING_DEGREES = 0.004;

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
 * Queries the Overpass API for roads, water, and parks within that
 * bounding box, all in one request
 *  - Build an overpass QL query string with three unioned clauses
 *  - POSTs that query
 *  - Returns the parsed JSON response
 */
async function fetchOverpass(bounds) {
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"^(primary|secondary|tertiary|residential|pedestrian|living_street)$"]
        (${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
      way["natural"="water"]
        (${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
      way["waterway"="riverbank"]
        (${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
      way["leisure"="park"]
        (${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
      way["landuse"~"^(grass|forest)$"]
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
 * Sorts the raw Overpass elements into three buckets based on their OSM
 * tags - same source data, split by what it should visually represent
 * (roads get drawn as lines, water/parks get drawn as filled shapes)
 */
function classify(elements) {
  const roads = [];
  const water = [];
  const parks = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.geometry) continue;

    const tags = el.tags || {};
    const points = el.geometry.map((pt) => [pt.lat, pt.lon]);

    if (tags.highway) {
      roads.push({ highway: tags.highway, points });
    } else if (tags.natural === "water" || tags.waterway === "riverbank") {
      water.push({ points });
    } else if (
      tags.leisure === "park" ||
      tags.landuse === "grass" ||
      tags.landuse === "forest"
    ) {
      parks.push({ points });
    }
  }

  return { roads, water, parks };
}

/**
 * Reads and parses theatres.json
 * Computes the bounding box
 * Calls fetchOverpass(bounds) to get raw Overpass data
 * Classifies that data into roads/water/parks
 * Writes this to mapData.json
 */
async function main() {
  const theatresRaw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(theatresRaw);

  const bounds = getPaddedBounds(theatres);
  console.log("Fetching map data for bounds:", bounds);

  const data = await fetchOverpass(bounds);
  const { roads, water, parks } = classify(data.elements);

  const output = { bounds, roads, water, parks };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output));
  console.log(
    `Saved ${roads.length} roads, ${water.length} water features, ${parks.length} parks.`
  );
}

main();
