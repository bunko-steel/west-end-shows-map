/**
 * Rendering the actual map as an SVG, with pan and zoom
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { getTheatresWithShows } from "../data";
import {
  getBounds,
  getCoreBounds,
  getCanvasDimensions,
  projectToCanvas,
  projectPoint,
  pointsToPath,
} from "../utils/project";
import TheatreMarker from "./TheatreMarker";
import DetailCard from "./DetailCard";
import FunctionsDrawer from "./FunctionsDrawer";
import mapData from "../../../data/mapData.json";
import tubeData from "../../../data/tubeData.json";
import { resolveLabelPositions } from "../utils/labelLayout";
import { themes, defaultThemeId } from "../themes";
import { useTheme } from "../context/ThemeContext";

// Shrinks an element's font-size until its rendered text actually fits its available width.
function useFitText(
  ref,
  text,
  { min = 13, max = 30, leftGap = 24, rightGap = 24 } = {}
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function fit() {
      const parent = el.offsetParent;
      if (!parent) return;

      const available = parent.clientWidth - leftGap - rightGap;

      let fontSize = max;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = `${fontSize}px`;

      while (fontSize > min && el.scrollWidth > available) {
        fontSize -= 0.5;
        el.style.fontSize = `${fontSize}px`;
      }

      el.style.whiteSpace = el.scrollWidth > available ? "normal" : "nowrap";
    }

    fit();
    window.addEventListener("resize", fit);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit);
    }

    return () => window.removeEventListener("resize", fit);
  }, [ref, text, min, max, leftGap, rightGap]);
}

// Initial view, how much we can see
const INITIAL_VIEW_TRIM_PERCENT = 5;

// Fits arbitrarily sized box into the viewport
function getFitTransform(
  viewportWidth,
  viewportHeight,
  boxTopLeft,
  boxBottomRight,
  padding = 1
) {
  const boxWidth = boxBottomRight.x - boxTopLeft.x;
  const boxHeight = boxBottomRight.y - boxTopLeft.y;
  const boxCenterX = (boxTopLeft.x + boxBottomRight.x) / 2;
  const boxCenterY = (boxTopLeft.y + boxBottomRight.y) / 2;

  const scale = Math.min(
    (viewportWidth * padding) / boxWidth,
    (viewportHeight * padding) / boxHeight
  );

  return zoomIdentity
    .translate(
      viewportWidth / 2 - boxCenterX * scale,
      viewportHeight / 2 - boxCenterY * scale
    )
    .scale(scale);
}

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

  // Get label positions just once at the start, not recalculating at every re-render
  const { worldBounds, worldCanvas, positioned, labelPositions, coreBox } =
    useMemo(() => {
      const theatres = getTheatresWithShows();
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

      const trimmedBounds = getCoreBounds(theatres, INITIAL_VIEW_TRIM_PERCENT);
      const coreBox = {
        topLeft: projectPoint(
          trimmedBounds.maxLat,
          trimmedBounds.minLng,
          worldBounds,
          worldCanvas
        ),
        bottomRight: projectPoint(
          trimmedBounds.minLat,
          trimmedBounds.maxLng,
          worldBounds,
          worldCanvas
        ),
      };

      return { worldBounds, worldCanvas, positioned, labelPositions, coreBox };
    }, []);
  const [transform, setTransform] = useState(() =>
    getFitTransform(
      viewport.width,
      viewport.height,
      coreBox.topLeft,
      coreBox.bottomRight,
      0.85
    )
  );

  const { themeId } = useTheme();
  const theme = themes[themeId] ?? themes[defaultThemeId];

  const isMobile = viewport.width <= 680;

  const TITLE_TEXT = "THE WEST END";
  const titleRef = useRef(null);
  useFitText(
    titleRef,
    TITLE_TEXT,
    isMobile
      ? { min: 13, max: 30, leftGap: 32, rightGap: 32 }
      : { min: 13, max: 30, leftGap: 44, rightGap: 24 }
  );

  useEffect(() => {
    const svgEl = select(svgRef.current);

    const fitScale = Math.min(
      viewport.width / worldCanvas.width,
      viewport.height / worldCanvas.height
    );
    const initialTransform = getFitTransform(
      viewport.width,
      viewport.height,
      coreBox.topLeft,
      coreBox.bottomRight,
      0.85
    );

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
    const dataWidth = bottomRight.x - topLeft.x;
    const dataHeight = bottomRight.y - topLeft.y;

    // Recalculated every time viewport changes, so uses window's current size
    const minCoverScale = Math.max(
      viewport.width / dataWidth,
      viewport.height / dataHeight
    );

    const zoomBehavior = d3Zoom()
      .scaleExtent([minCoverScale, fitScale * 5.5])
      .translateExtent([
        [topLeft.x, topLeft.y],
        [bottomRight.x, bottomRight.y],
      ])
      .on("zoom", (event) => setTransform(event.transform));

    svgEl.call(zoomBehavior);
    svgEl.call(zoomBehavior.transform, initialTransform);

    return () => svgEl.on(".zoom", null);
    // Re-runs whenever the window is resized, so the zoom-out limit is calculated with current viewport
  }, [viewport.width, viewport.height]);

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

        <g
          transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
        >
          {mapData.parks.map((park, i) => (
            <path
              key={`park-${i}`}
              d={pointsToPath(park.points, worldBounds, worldCanvas, true)}
              style={{ fill: "var(--park)" }}
              opacity={theme.opacity.park}
            />
          ))}

          {/*Every water feature is represented as a closed polygon, so just fill the shape*/}
          {mapData.water.map((body, i) => (
            <path
              key={`water-${i}`}
              d={pointsToPath(body.points, worldBounds, worldCanvas, true)}
              style={{ fill: "var(--water)" }}
              opacity={theme.opacity.water}
            />
          ))}

          {mapData.roads.map((way, i) => {
            const isMainRoad =
              way.highway === "primary" || way.highway === "secondary";

            return (
              <path
                key={i}
                d={pointsToPath(
                  way.points,
                  worldBounds,
                  worldCanvas,
                  way.isRoundabout
                )}
                style={{
                  stroke: "var(--brass)",
                  fill: way.isRoundabout ? "var(--brass)" : "none",
                }}
                strokeWidth={isMainRoad ? 1 : 0.5}
                opacity={
                  way.isRoundabout
                    ? theme.opacity.roundabout
                    : isMainRoad
                    ? theme.opacity.roadMain
                    : theme.opacity.roadMinor
                }
              />
            );
          })}

          {tubeData.lines.map((line) =>
            line.segments.map((points, i) => (
              <path
                key={`tube-line-${line.id}-${i}`}
                d={pointsToPath(points, worldBounds, worldCanvas, false)}
                style={{ stroke: line.colour, fill: "none" }}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={theme.opacity.tubeLine}
              />
            ))
          )}

          {tubeData.stations.map((station) => {
            const { x, y } = projectPoint(
              station.lat,
              station.lng,
              worldBounds,
              worldCanvas
            );
            return (
              <circle
                key={`tube-station-${station.id}`}
                cx={x}
                cy={y}
                r={3.5}
                style={{ fill: "var(--parchment)", stroke: "var(--ink)" }}
                strokeWidth={1}
                opacity={0.9}
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
          inset: "12px",
          border: "1.5px solid var(--ink)",
          pointerEvents: "none",
        }}
      />

      <h1
        ref={titleRef}
        style={{
          position: "absolute",
          margin: 0,
          fontFamily: "var(--font-display)",
          color: "var(--ink)",
          letterSpacing: "0.12em",
          fontWeight: "normal",
          pointerEvents: "none",
          ...(isMobile
            ? {
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }
            : {
                top: "36px",
                left: "44px",
              }),
        }}
      >
        {TITLE_TEXT}
      </h1>

      <FunctionsDrawer isMobile={isMobile} />

      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: isMobile ? "50%" : "24px",
          width: "320px",
          maxWidth: "calc(100vw - 48px)",
          zIndex: 4,
          transform: isMobile
            ? `translate(-50%, ${isOpen ? 0 : 16}px)`
            : `translateY(${isOpen ? 0 : 16}px)`,
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
