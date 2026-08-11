import theatres from "../../data/theatres.json";
import showsData from "../../data/shows.json";

// theatres.json contains all theatres (list barely updates)
// shows.json contains all shows (updates more frequently)
// Function combines these two lists
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
