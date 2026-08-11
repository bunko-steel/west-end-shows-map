import fs from "fs/promises";

const THEATRES_PATH = new URL("../data/theatres.json", import.meta.url);

// My best guess at each theatre's exact Wikipedia article title.
// Some of these WILL be wrong — Wikipedia's actual titles are quirky
// (disambiguation suffixes, punctuation). The next script will tell us
// exactly which ones fail, and we fix them here, one line at a time.
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

  // This only ADDS a field — lat/lng and everything else you already
  // have stays exactly as it was.
  await fs.writeFile(THEATRES_PATH, JSON.stringify(theatres, null, 2));
  console.log(
    `Added Wikipedia titles to ${matched}/${theatres.length} theatres.`
  );
}

main();
