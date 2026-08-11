import { useState } from "react";
import { getTheatresWithShows } from "../data";
import {
  getCanvasDimensions,
  projectToCanvas,
  pointsToPath,
} from "../utils/project";
import TheatreMarker from "./TheatreMarker";
import DetailCard from "./DetailCard";
import streetsData from "../../../data/streets.json";

function MapCanvas() {
  const theatres = getTheatresWithShows();
  const bounds = streetsData.bounds;
  const { width, height } = getCanvasDimensions(bounds);
  const canvas = { width, height, marginX: 60, marginY: 110 };

  const positioned = theatres.map((theatre) => ({
    ...theatre,
    ...projectToCanvas(theatre, bounds, canvas),
  }));

  const [selectedId, setSelectedId] = useState(null);
  const selected = positioned.find((t) => t.id === selectedId) || null;

  return (
    <div style={{ maxWidth: `${width}px`, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: "block" }}
      >
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          style={{ fill: "var(--ink)" }}
        />
        <rect
          x="20"
          y="20"
          width={width - 40}
          height={height - 40}
          style={{ fill: "none", stroke: "var(--gold)" }}
          strokeWidth="1.5"
        />
        <text
          x={width / 2}
          y="70"
          textAnchor="middle"
          style={{ fontFamily: "var(--font-display)", fill: "var(--gold)" }}
          fontSize="30"
          letterSpacing="3"
        >
          WEST END TONIGHT
        </text>

        {streetsData.ways.map((way, i) => {
          const isMainRoad =
            way.highway === "primary" || way.highway === "secondary";
          return (
            <path
              key={i}
              d={pointsToPath(way.points, bounds, canvas)}
              fill="none"
              style={{ stroke: "var(--gold)" }}
              strokeWidth={isMainRoad ? 1 : 0.5}
              opacity={isMainRoad ? 0.6 : 0.3}
            />
          );
        })}

        {positioned.map((theatre) => (
          <TheatreMarker
            key={theatre.id}
            theatre={theatre}
            isSelected={theatre.id === selectedId}
            onSelect={() => setSelectedId(theatre.id)}
          />
        ))}
      </svg>

      {selected && (
        <DetailCard theatre={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

export default MapCanvas;
