/**
 * Rendering the actual map as an SVG, with pan and zoom
 */

import { useState, useEffect, useRef } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { getTheatresWithShows } from "../data";
import {
  getBounds,
  getCanvasDimensions,
  projectToCanvas,
  projectPoint,
  pointsToPath,
} from "../utils/project";
import TheatreMarker from "./TheatreMarker";
import DetailCard from "./DetailCard";
import mapData from "../../../data/mapData.json";
import { resolveLabelPositions } from "../utils/labelLayout";

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

function MapCanvas() {
  const svgRef = useRef(null);
  const viewport = useWindowSize();
  const theatres = getTheatresWithShows();

  // WORLD SPACE: a fixed projection built once from the theatre cluster's
  // own tight bounds. This never changes after load - it does not care
  // about window size at all. Panning and zooming just move a camera over
  // this fixed world, instead of ever recalculating geography again.
  const worldBounds = getBounds(theatres);
  const worldCanvas = {
    ...getCanvasDimensions(worldBounds, 1400),
    marginX: 40,
    marginY: 40,
  };

  const positioned = theatres.map((theatre) => ({
    ...theatre,
    ...projectToCanvas(theatre, worldBounds, worldCanvas),
  }));
  const labelPositions = resolveLabelPositions(positioned, 13);

  const [transform, setTransform] = useState(zoomIdentity);

  // Sets up d3-zoom exactly once. D3 owns the drag/wheel physics and
  // clamping; we just store whatever transform it computes as normal React
  // state, which re-renders the <g> below whenever it changes.
  useEffect(() => {
    const svgEl = select(svgRef.current);

    // "Contain" fit - shows the whole theatre cluster with nothing
    // cropped, matching the zoom level that looked right before.
    const fitScale = Math.min(
      viewport.width / worldCanvas.width,
      viewport.height / worldCanvas.height
    );
    const initialTransform = zoomIdentity
      .translate(
        (viewport.width - worldCanvas.width * fitScale) / 2,
        (viewport.height - worldCanvas.height * fitScale) / 2
      )
      .scale(fitScale);

    // Pan is only allowed within the area we actually fetched data for -
    // project mapData's own (larger, padded) bounds into this same world
    // space, and that becomes the hard edge of where you can pan to. This
    // is the actual mechanism that stops blank space from being reachable.
    const topLeft = projectPoint(
      mapData.bounds.maxLat,
      mapData.bounds.minLng,
      worldBounds,
      worldCanvas
    );
    const bottomRight = projectPoint(
      mapData.bounds.minLat,
      mapData.bounds.maxLng,
      worldBounds,
      worldCanvas
    );

    const zoomBehavior = d3Zoom()
      .scaleExtent([fitScale * 0.6, fitScale * 3.5])
      .translateExtent([
        [topLeft.x, topLeft.y],
        [bottomRight.x, bottomRight.y],
      ])
      .on("zoom", (event) => setTransform(event.transform));

    svgEl.call(zoomBehavior);
    // Syncs D3's own internal state to our computed starting view. Skipping
    // this is a common bug: the map looks right on load, but the very
    // first drag or scroll jumps unexpectedly, because D3 assumed it was
    // starting from zero rather than from this fitted position.
    svgEl.call(zoomBehavior.transform, initialTransform);

    return () => svgEl.on(".zoom", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deliberate one-time setup, not re-run on resize

  const [selectedId, setSelectedId] = useState(null);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  useEffect(() => {
    if (selectedId) setLastSelectedId(selectedId);
  }, [selectedId]);

  const isOpen = Boolean(selectedId);
  const panelTheatre =
    positioned.find((t) => t.id === (selectedId ?? lastSelectedId)) || null;

  const handleMarkerSelect = (id) => (event) => {
    event.stopPropagation();
    setSelectedId(id);
  };

  const handleClose = () => setSelectedId(null);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        width="100%"
        height="100%"
        style={{ display: "block", cursor: "grab" }}
        onClick={handleClose}
      >
        <rect
          x="0"
          y="0"
          width={viewport.width}
          height={viewport.height}
          style={{ fill: "var(--parchment)" }}
        />

        {/* Everything geographic lives in this one group - the pan/zoom
            transform applies here only, so the parchment background and
            the title/frame chrome (outside the svg entirely) never move */}
        <g
          transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
        >
          {mapData.parks.map((park, i) => (
            <path
              key={`park-${i}`}
              d={pointsToPath(park.points, worldBounds, worldCanvas, true)}
              style={{ fill: "var(--park)" }}
              opacity="0.5"
            />
          ))}

          {mapData.water.map((body, i) =>
            body.isLine ? (
              <path
                key={`water-${i}`}
                d={pointsToPath(body.points, worldBounds, worldCanvas, false)}
                fill="none"
                style={{ stroke: "var(--water)" }}
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            ) : (
              <path
                key={`water-${i}`}
                d={pointsToPath(body.points, worldBounds, worldCanvas, true)}
                style={{ fill: "var(--water)" }}
                opacity="0.6"
              />
            )
          )}

          {mapData.roads.map((way, i) => {
            const isMainRoad =
              way.highway === "primary" || way.highway === "secondary";
            return (
              <path
                key={i}
                d={pointsToPath(way.points, worldBounds, worldCanvas)}
                fill="none"
                style={{ stroke: "var(--brass)" }}
                strokeWidth={isMainRoad ? 1 : 0.5}
                opacity={isMainRoad ? 0.7 : 0.4}
              />
            );
          })}

          {positioned.map((theatre) => (
            <TheatreMarker
              key={theatre.id}
              theatre={theatre}
              labelPos={labelPositions[theatre.id]}
              isSelected={theatre.id === selectedId}
              onSelect={handleMarkerSelect(theatre.id)}
            />
          ))}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "1.5px solid var(--ink)",
          pointerEvents: "none",
        }}
      />
      <h1
        style={{
          position: "absolute",
          top: "36px",
          left: "50%",
          transform: "translateX(-50%)",
          margin: 0,
          fontFamily: "var(--font-display)",
          color: "var(--ink)",
          fontSize: "30px",
          letterSpacing: "3px",
          fontWeight: "normal",
          pointerEvents: "none",
        }}
      >
        WEST END LIFE
      </h1>

      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: "24px",
          width: "320px",
          maxWidth: "calc(100vw - 48px)",
          transform: isOpen ? "translateY(0)" : "translateY(16px)",
          opacity: isOpen ? 1 : 0,
          transition: "transform 0.3s ease, opacity 0.3s ease",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {panelTheatre && (
          <DetailCard theatre={panelTheatre} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}

export default MapCanvas;
