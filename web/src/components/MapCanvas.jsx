/**
 * Rendering the actual map as an SVG
 */

import { useState, useEffect } from "react";
import { getTheatresWithShows } from "../data";
import {
  getCanvasDimensions,
  projectToCanvas,
  pointsToPath,
} from "../utils/project";
import TheatreMarker from "./TheatreMarker";
import DetailCard from "./DetailCard";
import streetsData from "../../../data/streets.json";

const PANEL_WIDTH = 320;

function MapCanvas() {
  // Initial setup
  const theatres = getTheatresWithShows();
  const bounds = streetsData.bounds;
  const { width, height } = getCanvasDimensions(bounds);
  const canvas = { width, height, marginX: 60, marginY: 110 };

  // Maps over every theatre, converting long/lat into x/y pixel coords on SVG canvas
  const positioned = theatres.map((theatre) => ({
    ...theatre,
    ...projectToCanvas(theatre, bounds, canvas),
  }));

  const [selectedId, setSelectedId] = useState(null);

  // Keeps showing the last-selected theatre's content while the panel slides
  // shut, instead of going blank the instant you close it
  const [lastSelectedId, setLastSelectedId] = useState(null);

  useEffect(() => {
    if (selectedId) setLastSelectedId(selectedId);
  }, [selectedId]);

  const isOpen = Boolean(selectedId);
  const panelTheatre =
    positioned.find((t) => t.id === (selectedId ?? lastSelectedId)) || null;

  // Stops the click bubbling up to the SVG's own onClick (which closes the
  // panel) - without this, opening a marker would immediately close it
  const handleMarkerSelect = (id) => (event) => {
    event.stopPropagation();
    setSelectedId(id);
  };

  const handleClose = () => setSelectedId(null);

  // The render - edit here for styling
  return (
    <div
      style={{
        display: "flex",
        maxWidth: "1500px",
        margin: "0 auto",
      }}
    >
      {/* Map fills whatever space is left over once the panel column is
          accounted for - this is what makes it scale up on wide screens */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ display: "block" }}
          onClick={handleClose}
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
            WEST END FAMALAM
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
              onSelect={handleMarkerSelect(theatre.id)}
            />
          ))}
        </svg>
      </div>

      {/* Reserved panel lane - always takes up this space, whether or not
          a theatre is selected, so the map never gets covered */}
      <div
        style={{
          width: `${PANEL_WIDTH}px`,
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          background: "var(--ink)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            transform: isOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s ease",
          }}
        >
          {panelTheatre && (
            <DetailCard theatre={panelTheatre} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}

export default MapCanvas;
