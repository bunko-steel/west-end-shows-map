import { useState, useRef, useLayoutEffect, useCallback } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import CurtainTassel from "./CurtainTassel";

const EDGE_MARGIN = 24;
const MOBILE_MAX_REVEAL_VH = 0.55;
// bounce curve, 1.56 for the overshoot
const BOUNCE = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const ROPE_SETTLE = "cubic-bezier(0.3, 1, 0.4, 1)";

// Scale down tassel for the mobile version
const MOBILE_TASSEL_SCALE = 0.8;
// How far open (as a fraction of the panel's full height) you need to drag
// before letting go snaps it open instead of closed.
const PULL_OPEN_FRACTION = 0.4;

function FunctionsDrawer({ isMobile, onOccupiedHeightChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealHeight, setRevealHeight] = useState(0);
  // null when not dragging. While dragging, this is the panel's current height in px
  const [dragReveal, setDragReveal] = useState(null);
  // Desktop: attaches to the invisible fixed-size measuring layer.
  // Mobile: attaches to the visual box itself, since there's only one layer.
  const wrapperRef = useRef(null);
  const barRef = useRef(null);
  const panelRef = useRef(null);

  const dragRef = useRef(null);

  const computeReveal = useCallback(() => {
    const barHeight = barRef.current?.offsetHeight ?? 0;
    const contentNatural = panelRef.current?.offsetHeight ?? 0;
    const maxAvailable = isMobile
      ? window.innerHeight * MOBILE_MAX_REVEAL_VH
      : Math.max((wrapperRef.current?.offsetHeight ?? 0) - barHeight, 0);
    setRevealHeight(Math.min(contentNatural, maxAvailable));
  }, [isMobile]);

  useLayoutEffect(() => {
    computeReveal();
    window.addEventListener("resize", computeReveal);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(computeReveal);
    }
    return () => window.removeEventListener("resize", computeReveal);
  }, [computeReveal]);

  useLayoutEffect(() => {
    if (!isMobile || !onOccupiedHeightChange) return;
    const barHeight = barRef.current?.offsetHeight ?? 0;
    onOccupiedHeightChange(
      EDGE_MARGIN + barHeight + (isOpen ? revealHeight : 0)
    );
  }, [isMobile, isOpen, revealHeight, onOccupiedHeightChange]);

  const toggle = () => setIsOpen((open) => !open);

  // The panel's actual current height right now, whether its settled or mid-drag
  const currentReveal = dragReveal ?? (isOpen ? revealHeight : 0);

  // CurtainTassel owns its own pointer handling
  const handlePullStart = () => {
    dragRef.current = { startReveal: currentReveal };
    setDragReveal(currentReveal);
  };

  const handlePullMove = (deltaY) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startReveal + deltaY;
    setDragReveal(Math.min(Math.max(next, 0), revealHeight));
  };

  const handlePullEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsOpen(dragReveal > revealHeight * PULL_OPEN_FRACTION);
    setDragReveal(null);
  };

  // Animating revealing the stuff inside the drawer
  const revealWindow = (
    <div
      style={{
        height: `${currentReveal}px`,
        overflow: "hidden",
        transition: dragReveal !== null ? "none" : `height 0.5s ${BOUNCE}`,
      }}
    >
      <div
        ref={panelRef}
        aria-hidden={!isOpen}
        style={{ padding: "14px", pointerEvents: isOpen ? "auto" : "none" }}
      >
        <ThemeSwitcher />
      </div>
    </div>
  );

  // Border seperating Functions title from the actual functions
  // Only needed when the Functions drawer is actually opened
  const bar = (
    <button
      ref={barRef}
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Hide map functions" : "Show map functions"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        padding: "9px 16px",
        background: "var(--curtain-red)",
        border: "none",
        [isMobile ? "borderBottom" : "borderTop"]: isOpen
          ? "1px solid var(--ink)"
          : "none",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontStyle: "italic",
          letterSpacing: "1.5px",
          color: "var(--parchment)",
        }}
      >
        Functions
      </span>
    </button>
  );

  const tasselOverlay = (
    <div
      style={{
        position: "absolute",
        top: 5,
        right: -10,
        transformOrigin: "top right",
        transform: isMobile
          ? `scale(${MOBILE_TASSEL_SCALE})`
          : `translateY(${currentReveal}px)`,
        transition:
          dragReveal !== null ? "none" : `transform 0.5s ${ROPE_SETTLE}`,
      }}
    >
      <CurtainTassel
        strandColor="var(--curtain-red)"
        knotColor="var(--brass)"
        isPulling={dragReveal !== null}
        onPullStart={handlePullStart}
        onPullMove={handlePullMove}
        onPullEnd={handlePullEnd}
      />
    </div>
  );

  const visualBoxStyle = {
    border: "1.5px solid var(--ink)",
    borderRadius: "8px",
    overflow: "hidden",
    background: "var(--parchment)",
    display: "flex",
    flexDirection: "column",
  };

  if (isMobile) {
    // Layout for mobile versiom
    return (
      <div
        style={{
          position: "fixed",
          bottom: `${EDGE_MARGIN}px`,
          left: "24px",
          right: "24px",
          zIndex: 6,
        }}
      >
        <div ref={wrapperRef} style={visualBoxStyle}>
          {bar}
          {revealWindow}
        </div>
        {tasselOverlay}
      </div>
    );
  }

  // Desktop/laptop version
  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        top: "30px",
        right: "30px",
        bottom: "24px",
        width: "320px",
        zIndex: 6,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        pointerEvents: "none",
      }}
    >
      <div style={{ ...visualBoxStyle, pointerEvents: "auto" }}>
        {revealWindow}
        {bar}
      </div>
      {tasselOverlay}
    </div>
  );
}

export default FunctionsDrawer;
