/**
 * Fetches London Underground line geometry and station locations from
 * OpenStreetMap. Scoped to the exact same bounding box already used for
 * roads/water/parks in mapData.json - tube data should only cover the
 * area we already render, not the whole network.
 */

import fs from "fs/promises";

const MAP_DATA_PATH = new URL("../data/mapData.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/tubeData.json", import.meta.url);

const OVERPASS_URL = "https://overpass.private.coffee/api/interpreter";
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 4;

// Used only if OSM is missing a colour tag on a line relation, so a render
// never breaks - shouldn't come up in practice, LU route relations are
// consistently tagged with their official TfL colour.
const FALLBACK_LINE_COLOUR = "#4a4a4a";

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

function buildLinesQuery(bounds) {
  const bboxArgs = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
  return `
    [out:json][timeout:900];
    relation["type"="route"]["route"="subway"]["network"~"London Underground"]
      (${bboxArgs});
    out geom(${bboxArgs});
  `;
}

function buildStationsQuery(bounds) {
  const bboxArgs = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
  return `
    [out:json][timeout:600];
    node["railway"="station"]["network"~"London Underground"]
      (${bboxArgs});
    out;
  `;
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
 * Every route relation is built from way members, and OSM represents a
 * given physical stretch of track as a single way object - a route's
 * forward/backward twin, and every other branch of the same line sharing
 * that stretch, all reference the *same* way. That's what was still
 * causing doubling after the previous fix: routeKey correctly stopped
 * exact forward/backward reverses, but a line's genuinely-distinct
 * branches (Central's Hainault/Loughton/Ealing Broadway/White City
 * branches, say) still all trace the same shared trunk through the West
 * End before diverging further out - four legitimate branches, stacked on
 * top of each other through the exact area this map covers.
 *
 * Tracking which way IDs have already been drawn *for a given line name*
 * fixes this at the root: once a way's geometry has been added, any later
 * relation referencing that same way (its reverse twin, or a sibling
 * branch) contributes nothing new. Scoped per line name rather than
 * globally, so lines that genuinely share physical track with a
 * *different* line - Circle/District/Hammersmith & City famously run on
 * the same rails for long stretches - still each render in full, exactly
 * as the real Tube map shows overlapping coloured lines for shared
 * corridors rather than picking one winner.
 */
function extractLines(elements) {
  const seenWayIdsByLine = new Map(); // line name -> Set of way ids already drawn
  const lineByName = new Map(); // line name -> { id, name, colour, segments }
  let skippedDuplicateWays = 0;

  for (const el of elements) {
    if (el.type !== "relation" || !el.members) continue;
    const tags = el.tags || {};

    const rawName = tags.name || tags.ref || `Line ${el.id}`;
    const colour = tags.colour || FALLBACK_LINE_COLOUR;
    // rawName is "Northern line: Edgware → Bank → Morden" - the route
    // description has done its job of identifying this as one relation
    // among several for the same line; keep just the plain line name.
    const name = rawName.includes(":")
      ? rawName.split(":", 1)[0].trim()
      : rawName;

    if (!seenWayIdsByLine.has(name)) seenWayIdsByLine.set(name, new Set());
    if (!lineByName.has(name)) {
      lineByName.set(name, { id: name, name, colour, segments: [] });
    }
    const seenWayIds = seenWayIdsByLine.get(name);
    const lineEntry = lineByName.get(name);

    const wayMembers = el.members.filter((m) => m.type === "way" && m.geometry);
    for (const member of wayMembers) {
      if (seenWayIds.has(member.ref)) {
        skippedDuplicateWays++;
        continue;
      }
      seenWayIds.add(member.ref);
      lineEntry.segments.push(...splitOnNulls(member.geometry));
    }
  }

  if (skippedDuplicateWays > 0) {
    console.log(
      `  Skipped ${skippedDuplicateWays} way(s) already drawn for their line (shared trunk track or a reverse-direction twin).`
    );
  }

  return Array.from(lineByName.values()).filter((l) => l.segments.length > 0);
}

/**
 * Station nodes come back as plain point elements (no geometry array
 * needed - a node's own lat/lon *is* its geometry). Dedupes by name in
 * case OSM has more than one node for the same named station complex.
 */
function extractStations(elements) {
  const seenNames = new Set();
  const stations = [];

  for (const el of elements) {
    if (el.type !== "node") continue;
    const name = el.tags && el.tags.name;
    if (!name || seenNames.has(name)) continue;

    seenNames.add(name);
    stations.push({ id: el.id, name, lat: el.lat, lng: el.lon });
  }

  return stations;
}

/**
 * Reads the bounds already used for mapData.json (so tube coverage always
 * matches the rendered map, not the whole Underground network), fetches
 * lines and stations as two separate Overpass calls, and writes the
 * result to tubeData.json.
 */
async function main() {
  const mapDataRaw = await fs.readFile(MAP_DATA_PATH, "utf-8");
  const { bounds } = JSON.parse(mapDataRaw);

  console.log("Fetching tube data for bounds:", bounds);

  console.log("Fetching tube lines...");
  const linesData = await runOverpassQuery(buildLinesQuery(bounds));
  const lines = extractLines(linesData.elements);

  // Brief pause before the second call - considerate of the shared mirror,
  // and slightly more likely to succeed if it was just momentarily busy.
  await new Promise((r) => setTimeout(r, 5000));

  console.log("Fetching tube stations...");
  const stationsData = await runOverpassQuery(buildStationsQuery(bounds));
  const stations = extractStations(stationsData.elements);

  const totalSegments = lines.reduce((sum, l) => sum + l.segments.length, 0);

  const output = { lines, stations };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output));
  console.log(
    `Saved ${lines.length} tube route relations (${totalSegments} line segments) and ${stations.length} tube stations.`
  );
}

main();
