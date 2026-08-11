/**
 * Uses the wikipediaTitle field to fetch each theatre's Wikipedia page and scrape what
 * show is being played there, writing results to shows.json
 */

import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);
const SHOWS_PATH = new URL("../data/shows.json", import.meta.url);

// Wikipedia's API requires a descriptive User-Agent identifying your script
const USER_AGENT = "west-end-map-learning-project/1.0 (your-email@example.com)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wikipedia article text ("wikitext") isn't JSON or HTML. It is its own
// markup format. An infobox field looks like:
//   | production = ''[[The Lion King (musical)|The Lion King]]''
// This function finds that line and strips the markup down to plain text.
function extractProduction(wikitext) {
  const match = wikitext.match(/\|\s*production\s*=\s*(.+)/i);
  if (!match) return null;

  const value = match[1]
    .replace(/<!--.*?-->/g, "") // HTML comments
    .replace(/<ref[^>]*>.*?<\/ref>/gi, "") // footnotes
    .replace(/<br\s*\/?>/gi, " / ") // multiple shows on one line
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1") // [[link|Text]] -> Text
    .replace(/'''?/g, "") // bold/italic markup
    .trim();

  return value || null;
}

/**
 * Fetches the raw wikitext of a page:
 *  - Builds a MediaWiki API query URL asking for the page's revisions content (current article text)
 *  - Sends the request
 *  - Parses JSON and gets data.query.pages[0]
 *  - Gets the raw wikitext string if it can
 */
async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`;

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

  if (!response.ok) {
    throw new Error(`Wikipedia API returned ${response.status} for "${title}"`);
  }

  const data = await response.json();
  const page = data.query.pages[0];

  if (page.missing) return null; // no page exists under this exact title

  return page.revisions[0].slots.main.content;
}

/**
 * Reads and parses theatres.json
 * Looping through each theatre:
 *  - Fetches wikitext for that theatre's page
 *  - Runs extractProduction for that theatre's page
 * Writes to shows.json
 */
async function main() {
  const theatresRaw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(theatresRaw);

  const shows = [];

  for (const theatre of theatres) {
    if (!theatre.wikipediaTitle) {
      console.warn(`Skipping ${theatre.name} — no wikipediaTitle set`);
      continue;
    }

    console.log(`Fetching ${theatre.name} (${theatre.wikipediaTitle})...`);

    try {
      const wikitext = await fetchWikitext(theatre.wikipediaTitle);

      if (!wikitext) {
        console.warn(
          `Page not found for "${theatre.wikipediaTitle}" — check the exact title on Wikipedia`
        );
        continue;
      }

      const production = extractProduction(wikitext);

      if (!production) {
        console.warn(`No "production" field found for ${theatre.name}`);
        continue;
      }

      shows.push({ theatreId: theatre.id, showName: production });
      console.log(`${production}`);
    } catch (err) {
      console.error(`Failed for ${theatre.name}:`, err.message);
    }

    await sleep(500); // delay between requests
  }

  const output = { lastUpdated: new Date().toISOString(), shows };
  await fs.writeFile(SHOWS_PATH, JSON.stringify(output, null, 2));
  console.log(`Done. Wrote ${shows.length} shows to shows.json.`);
}

main();
