/**
 * Fetches street/road geometry, water features, and park/green-space
 * geometry from OpenStreetMap so the frontend can render a full stylized
 * map around the theatres, not just roads
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/mapData.json", import.meta.url);

const PADDING_DEGREES = 0.008;

// Compute a bounding box for map containing all theatres, with padding
const SOUTH_EXTRA_PADDING = 0.008;

function getPaddedBounds(theatres) {
  const lats = theatres.map((t) => t.lat);
  const lngs = theatres.map((t) => t.lng);

  return {
    minLat: Math.min(...lats) - PADDING_DEGREES - SOUTH_EXTRA_PADDING,
    maxLat: Math.max(...lats) + PADDING_DEGREES,
    minLng: Math.min(...lngs) - PADDING_DEGREES,
    maxLng: Math.max(...lngs) + PADDING_DEGREES,
  };
}

const OVERPASS_URL = "https://overpass.private.coffee/api/interpreter";
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 4;

async function runOverpassQuery(query, attempt = 1) {
  let response;
  try {
    response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "west-end-map-learning-project/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
  } catch (networkErr) {
    if (attempt >= MAX_ATTEMPTS) throw networkErr;
    return retryAfterDelay(query, attempt, networkErr.message);
  }

  if (response.ok) return response.json();

  const body = await response.text();
  if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
    return retryAfterDelay(query, attempt, `HTTP ${response.status}`);
  }
  throw new Error(`Overpass API returned ${response.status}: ${body}`);
}

async function retryAfterDelay(query, attempt, reason) {
  const delaySeconds = 15 * attempt; // 15s, 30s, 45s
  console.log(
    `  Overpass request failed (${reason}) - server is likely busy. ` +
      `Retrying in ${delaySeconds}s (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`
  );
  await new Promise((r) => setTimeout(r, delaySeconds * 1000));
  return runOverpassQuery(query, attempt + 1);
}

function buildFeaturesQuery(bounds) {
  const bboxArgs = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
  return `
    [out:json][timeout:1200];
    (
      way["highway"~"^(primary|secondary|tertiary|unclassified|residential|pedestrian|living_street)$"]
        (${bboxArgs});
      way["natural"="water"]
        (${bboxArgs});
      way["waterway"="riverbank"]
        (${bboxArgs});
      way["leisure"="park"]
        (${bboxArgs});
      way["landuse"~"^(grass|forest)$"]
        (${bboxArgs});
    );
    out geom(${bboxArgs});
  `;
}

/**
 * Seperate query for the river banks as want to fill in the river in one colour
 */
function buildRiverbankQuery(bounds) {
  const bboxArgs = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
  return `
    [out:json][timeout:1800];
    (
      relation["natural"="water"](${bboxArgs});
      relation["waterway"="riverbank"](${bboxArgs});
    );
    out geom;
  `;
}

function pointsEqual(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

/**
 * Chains separate segments back into single continuous lines/rings wherever their endpoints match exactly
 */
function chainSegments(segments) {
  const remaining = segments.map((s) => [...s]);
  const chains = [];

  while (remaining.length > 0) {
    let chain = remaining.shift();
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const chainStart = chain[0];
        const chainEnd = chain[chain.length - 1];
        const segStart = seg[0];
        const segEnd = seg[seg.length - 1];

        if (pointsEqual(chainEnd, segStart)) {
          chain = chain.concat(seg.slice(1));
        } else if (pointsEqual(chainEnd, segEnd)) {
          chain = chain.concat([...seg].reverse().slice(1));
        } else if (pointsEqual(chainStart, segEnd)) {
          chain = seg.slice(0, -1).concat(chain);
        } else if (pointsEqual(chainStart, segStart)) {
          chain = [...seg].reverse().slice(0, -1).concat(chain);
        } else {
          continue;
        }
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    chains.push(chain);
  }

  return chains;
}

function intersectLat(a, b, lat) {
  const t = (lat - a[0]) / (b[0] - a[0]);
  return [lat, a[1] + t * (b[1] - a[1])];
}

function intersectLng(a, b, lng) {
  const t = (lng - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), lng];
}

/**
 * Way nodes outside bounding box return 'null' rather than being omitted
 * Concatenating across a null results in drawing spurious straight lines between two unrelated parts
 * of the way, so split the run instead
 */
function splitOnNulls(geometry) {
  const segments = [];
  let current = [];

  for (const pt of geometry) {
    if (pt === null) {
      if (current.length >= 2) segments.push(current);
      current = [];
    } else {
      current.push([pt.lat, pt.lon]);
    }
  }
  if (current.length >= 2) segments.push(current);

  return segments;
}

/**
 * Sutherland-Hodgman polygon clipping against an axis-aligned lat/lng
 * box: clips a ring down to just the closed shape actually inside "bounds", inserting
 * boundary-following edges wherever the ring crosses in or out.
 */
function clipPolygonToBounds(ring, bounds) {
  const edges = [
    {
      inside: (p) => p[1] >= bounds.minLng,
      clip: (a, b) => intersectLng(a, b, bounds.minLng),
    },
    {
      inside: (p) => p[1] <= bounds.maxLng,
      clip: (a, b) => intersectLng(a, b, bounds.maxLng),
    },
    {
      inside: (p) => p[0] >= bounds.minLat,
      clip: (a, b) => intersectLat(a, b, bounds.minLat),
    },
    {
      inside: (p) => p[0] <= bounds.maxLat,
      clip: (a, b) => intersectLat(a, b, bounds.maxLat),
    },
  ];

  let output = ring;
  for (const edge of edges) {
    const input = output;
    output = [];
    if (input.length === 0) break;

    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const previous = input[(i - 1 + input.length) % input.length];
      const currentInside = edge.inside(current);
      const previousInside = edge.inside(previous);

      if (currentInside) {
        if (!previousInside) output.push(edge.clip(previous, current));
        output.push(current);
      } else if (previousInside) {
        output.push(edge.clip(previous, current));
      }
    }
  }
  return output;
}

/**
 * Turns relation elements into filled polygons: chains each relation's
 * "outer" member ways into rings, then clips those rings to our bounding box.
 * "inner" members are deliberately skipped rather than turned into holes
 */
function extractRelationPolygons(elements, bounds) {
  const polygons = [];
  const consumedWayIds = new Set();

  for (const el of elements) {
    if (el.type !== "relation" || !el.members) continue;
    const tags = el.tags || {};
    if (tags.natural !== "water" && tags.waterway !== "riverbank") continue;

    const outerMembers = el.members.filter(
      (m) => m.type === "way" && m.role === "outer" && m.geometry
    );
    for (const m of outerMembers) consumedWayIds.add(m.ref);

    const outerWays = outerMembers.map((m) =>
      m.geometry.map((pt) => [pt.lat, pt.lon])
    );
    if (outerWays.length === 0) continue;

    for (const ring of chainSegments(outerWays)) {
      if (!pointsEqual(ring[0], ring[ring.length - 1])) {
        console.log(
          `  relation ${el.id}: outer ring didn't fully close (${ring.length}-point open chain) - clipping it anyway`
        );
      }
      const clipped = clipPolygonToBounds(ring, bounds);
      if (clipped.length >= 3) {
        polygons.push({ points: clipped });
      }
    }
  }

  return { polygons, consumedWayIds };
}

/**
 * Classifying plain-way elements into roads, water, parks. `skipWayIds`
 * excludes any way already covered by a relation polygon, to avoid
 * drawing the same water body twice.
 */
function classifyFeatures(elements, skipWayIds) {
  const roads = [];
  const water = [];
  const parks = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.geometry) continue;
    if (skipWayIds.has(el.id)) continue;

    const tags = el.tags || {};
    const segments = splitOnNulls(el.geometry);

    for (const points of segments) {
      if (tags.highway) {
        roads.push({
          highway: tags.highway,
          isRoundabout: tags.junction === "roundabout",
          points,
        });
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
  }

  return { roads, water, parks };
}

/**
 * Reads and parses theatres.json, computes the bounding box, fetches
 * roads/parks/ponds and the riverbank relation as two separate Overpass
 * calls, classifies everything, and writes the result to mapData.json.
 */
async function main() {
  const theatresRaw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(theatresRaw);

  const bounds = getPaddedBounds(theatres);
  console.log("Fetching map data for bounds:", bounds);

  console.log("Fetching roads, parks, and ponds...");
  const featuresData = await runOverpassQuery(buildFeaturesQuery(bounds));

  console.log("Fetching riverbank relation(s)...");
  const riverbankData = await runOverpassQuery(buildRiverbankQuery(bounds));

  const { polygons: riverbankPolygons, consumedWayIds } =
    extractRelationPolygons(riverbankData.elements, bounds);
  const { roads, water, parks } = classifyFeatures(
    featuresData.elements,
    consumedWayIds
  );

  const output = {
    bounds,
    roads,
    water: [...water, ...riverbankPolygons],
    parks,
  };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output));
  console.log(
    `Saved ${roads.length} roads, ${
      water.length + riverbankPolygons.length
    } water features (${riverbankPolygons.length} from relations), ${
      parks.length
    } parks.`
  );
}

main();
