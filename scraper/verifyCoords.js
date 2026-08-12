/**
 * Cross-checks stored theatre coordinates against Wikipedia's own
 * coordinates (a second, independent source) and flags any theatre
 * where the two disagree by more than a set distance - so you know
 * exactly which entries deserve a manual look, rather than re-geocoding
 * all 27 blindly and risking new errors.
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const USER_AGENT = "west-end-map-learning-project/1.0 (your-email@example.com)";
const FLAG_THRESHOLD_METERS = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Haversine formula - the standard way to compute real-world distance
// between two lat/lng points. Straight-line coordinate subtraction
// doesn't work here for the same reason the map's aspect ratio needed
// correcting earlier: degrees of longitude aren't a fixed real distance.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchWikipediaCoords(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=coordinates&format=json&formatversion=2`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

  if (!response.ok) {
    throw new Error(`Wikipedia API returned ${response.status} for "${title}"`);
  }

  const data = await response.json();
  const page = data.query.pages[0];

  if (page.missing || !page.coordinates || page.coordinates.length === 0) {
    return null;
  }

  return { lat: page.coordinates[0].lat, lng: page.coordinates[0].lon };
}

async function main() {
  const raw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(raw);

  const flagged = [];

  for (const theatre of theatres) {
    if (!theatre.wikipediaTitle) {
      console.warn(`Skipping ${theatre.name} - no wikipediaTitle set`);
      continue;
    }

    const wikiCoords = await fetchWikipediaCoords(theatre.wikipediaTitle);

    if (!wikiCoords) {
      console.warn(`  ⚠ No Wikipedia coordinates found for ${theatre.name}`);
      await sleep(300);
      continue;
    }

    const distance = distanceMeters(
      theatre.lat,
      theatre.lng,
      wikiCoords.lat,
      wikiCoords.lng
    );

    if (distance > FLAG_THRESHOLD_METERS) {
      flagged.push({ theatre, wikiCoords, distance });
    }

    await sleep(300);
  }

  console.log(`\nChecked ${theatres.length} theatres.`);
  if (flagged.length === 0) {
    console.log("All coordinates agree with Wikipedia within threshold.");
  } else {
    console.log(
      `${flagged.length} theatre(s) differ by more than ${FLAG_THRESHOLD_METERS}m:\n`
    );
    for (const { theatre, wikiCoords, distance } of flagged) {
      console.log(
        `${theatre.name} (${theatre.id}) - off by ${Math.round(distance)}m`
      );
      console.log(`  stored:    ${theatre.lat}, ${theatre.lng}`);
      console.log(`  wikipedia: ${wikiCoords.lat}, ${wikiCoords.lng}`);
    }
  }
}

main();
