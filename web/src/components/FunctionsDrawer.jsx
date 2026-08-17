import { useState, useRef, useLayoutEffect, useCallback } from "react";
import ThemeSwitcher from "./ThemeSwitcher";

const EDGE_MARGIN = 24;
const MOBILE_MAX_REVEAL_VH = 0.55;
const BOUNCE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function CurtainTassel({ isOpen, strandColor, knotColor }) {
  const width = 56;
  const knotY = 5;
  const baseHeight = 16;
  const strandCount = 9;
  const cx = width / 2;

  const strands = Array.from({ length: strandCount }, (_, i) => {
    const t = i / (strandCount - 1);
    const x = t * width;
    const spread = Math.sin(t * Math.PI);
    const y = knotY + baseHeight * (0.75 + 0.25 * spread);
    return { x, y };
  });

  return (
    <svg
      width={width}
      height={knotY + baseHeight + 4}
      viewBox={`0 0 ${width} ${knotY + baseHeight + 4}`}
      style={{
        display: "block",
        transition: `transform 0.4s ${BOUNCE}`,
        transform: isOpen ? "scaleY(-1)" : "none",
        transformOrigin: "center",
      }}
    >
      {strands.map((s, i) => (
        <line
          key={i}
          x1={cx}
          y1={knotY}
          x2={s.x}
          y2={s.y}
          stroke={strandColor}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ))}
      <circle
        cx={cx}
        cy={knotY}
        r="4"
        fill={knotColor}
        stroke="var(--ink)"
        strokeWidth="1"
      />
    </svg>
  );
}

function FunctionsDrawer({ isMobile, onOccupiedHeightChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealHeight, setRevealHeight] = useState(0);
  // Desktop: attaches to the invisible fixed-size measuring layer.
  // Mobile: attaches to the visual box itself, since there's only one layer.
  const wrapperRef = useRef(null);
  const barRef = useRef(null);
  const panelRef = useRef(null);

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

  // Animating revealing the stuff inside the drawer
  const revealWindow = (
    <div
      style={{
        height: isOpen ? `${revealHeight}px` : "0px",
        overflow: "hidden",
        transition: `height 0.5s ${BOUNCE}`,
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
      <CurtainTassel
        isOpen={isOpen}
        strandColor="var(--parchment)"
        knotColor="var(--brass)"
      />
    </button>
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
        ref={wrapperRef}
        style={{
          position: "fixed",
          bottom: `${EDGE_MARGIN}px`,
          left: "24px",
          right: "24px",
          zIndex: 6,
          ...visualBoxStyle,
        }}
      >
        {bar}
        {revealWindow}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        top: "36px",
        right: "40px",
        bottom: "24px",
        width: "220px",
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
    </div>
  );
}

export default FunctionsDrawer;
