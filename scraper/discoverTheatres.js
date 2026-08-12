/**
 * Pulls the authoritative list of West End theatres from Wikipedia's own
 * "Category:West End theatres" - a community-maintained list - instead of
 * a hand-typed guess. Gets each theatre's exact page title AND its
 * coordinates from the same API call, so no separate geocoding step is
 * needed for newly discovered theatres.
 *
 * Writes results to discoveredTheatres.json for manual review, rather
 * than merging directly into theatres.json - category pages occasionally
 * include a stray/miscategorized entry, so a quick human check before
 * merging is worth the extra step.
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/discoveredTheatres.json", import.meta.url);
const USER_AGENT = "west-end-map-learning-project/1.0 (your-email@example.com)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchCategoryMembers() {
  // cmtype=page excludes subcategories - the category page mentions it
  // has subcategories, and we only want actual theatre articles, not
  // category-tree nodes.
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=categorymembers" +
    "&cmtitle=Category:West%20End%20theatres&cmtype=page&cmlimit=500&format=json&formatversion=2";

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Wikipedia API returned ${response.status}`);
  }
  const data = await response.json();
  return data.query.categorymembers.map((m) => m.title);
}

async function fetchCoords(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=coordinates&format=json&formatversion=2`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return null;

  const data = await response.json();
  const page = data.query.pages[0];
  if (page.missing || !page.coordinates || page.coordinates.length === 0) {
    return null;
  }
  return { lat: page.coordinates[0].lat, lng: page.coordinates[0].lon };
}

async function main() {
  const existingRaw = await fs.readFile(THEATRES_PATH, "utf-8");
  const existing = JSON.parse(existingRaw);
  const existingTitles = new Set(existing.map((t) => t.wikipediaTitle));

  console.log("Fetching category members...");
  const titles = await fetchCategoryMembers();
  console.log(`Found ${titles.length} pages in the category.\n`);

  const discovered = [];

  for (const title of titles) {
    if (existingTitles.has(title)) {
      console.log(`Already have: ${title}`);
      await sleep(50);
      continue;
    }

    console.log(`New: ${title} - fetching coordinates...`);
    const coords = await fetchCoords(title);

    if (!coords) {
      console.warn(
        `  ⚠ No coordinates found for "${title}" - skipping, add manually if needed`
      );
      await sleep(300);
      continue;
    }

    discovered.push({
      id: slugify(title),
      name: title,
      address: null,
      lat: coords.lat,
      lng: coords.lng,
      wikipediaTitle: title,
    });

    await sleep(300);
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(discovered, null, 2));
  console.log(
    `\nWrote ${discovered.length} newly discovered theatres to discoveredTheatres.json`
  );
  console.log(
    "Review that file, then move any real theatres into theatres.json."
  );
}

main();
