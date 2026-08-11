import theatres from "../../data/theatres.json";
import showsData from "../../data/shows.json";

// theatres.json and shows.json are separate files because they update
// at different rates (theatres: basically never, shows: whenever you
// rerun the scraper). The UI doesn't care about that distinction — it
// just wants one combined list. This function does that combining,
// once, in one place, instead of every component having to cross-
// reference two arrays itself.
export function getTheatresWithShows() {
  return theatres.map((theatre) => {
    const match = showsData.shows.find((s) => s.theatreId === theatre.id);

    return {
      ...theatre,
      showName: match ? match.showName : null,
    };
  });
}

export const lastUpdated = showsData.lastUpdated;
