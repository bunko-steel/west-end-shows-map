// Fills theatres.json with associated Wikipedia article titles
/**
 * SOME OF THE TITLES NEED UPDATING
 */

// Module for async file reading/writing
import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);

// Claude's best guess at each theatre's exact Wikipedia article title.
const wikipediaTitles = {
  lyceum: "Lyceum Theatre, London",
  palace: "Palace Theatre, London",
  apollo: "Apollo Theatre, London",
  gielgud: "Gielgud Theatre",
  lyric: "Lyric Theatre, London",
  sondheim: "Sondheim Theatre",
  shaftesbury: "Shaftesbury Theatre",
  phoenix: "Phoenix Theatre, London",
  garrick: "Garrick Theatre, London",
  wyndhams: "Wyndham's Theatre",
  "noel-coward": "Noël Coward Theatre",
  "duke-of-york": "Duke of York's Theatre",
  ambassadors: "Ambassadors Theatre",
  "st-martins": "St Martin's Theatre",
  savoy: "Savoy Theatre",
  adelphi: "Adelphi Theatre",
  vaudeville: "Vaudeville Theatre, London",
  duchess: "Duchess Theatre",
  aldwych: "Aldwych Theatre",
  "drury-lane": "Theatre Royal, Drury Lane",
  "gillian-lynne": "Gillian Lynne Theatre",
  "prince-of-wales": "Prince of Wales Theatre",
  criterion: "Criterion Theatre",
  "her-majestys": "His Majesty's Theatre, London",
  "victoria-palace": "Victoria Palace Theatre",
  dominion: "Dominion Theatre",
  "london-palladium": "London Palladium",
};

// Seeing if Wikipedia article matches with the name we provide for the theatre
/**
 * Reads and parses theatres.json into an array of theatre objects
 * Loops through each theatre, looks up its id in wikipediaTitles
 * Writes entire theatres array back into same file, adding the wikipedia tiles page
 */
async function main() {
  const raw = await fs.readFile(THEATRES_PATH, "utf-8");
  const theatres = JSON.parse(raw);

  let matched = 0;
  for (const theatre of theatres) {
    const title = wikipediaTitles[theatre.id];
    if (title) {
      theatre.wikipediaTitle = title;
      matched++;
    } else {
      console.warn(`No Wikipedia title mapped for ${theatre.id}`);
    }
  }

  // Adds wikipedia title field
  await fs.writeFile(THEATRES_PATH, JSON.stringify(theatres, null, 2));
  console.log(
    `Added Wikipedia titles to ${matched}/${theatres.length} theatres.`
  );
}

main();
