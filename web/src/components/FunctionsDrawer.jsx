import { useState, useRef, useLayoutEffect, useCallback } from "react";
import ThemeSwitcher from "./ThemeSwitcher";

const GAP = 8;
const EDGE_MARGIN = 24;

function FunctionsDrawer({ isMobile, onOccupiedHeightChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Tells MapCanvas how much vertical space this drawer currently takes up in the screen
  // Desktop: in different corners so doesnt matter
  // Mobile: the theatre description sits above the functions drawer
  const reportHeight = useCallback(() => {
    if (!isMobile || !onOccupiedHeightChange) return;
    const buttonHeight = buttonRef.current?.offsetHeight ?? 0;
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const occupied = isOpen
      ? EDGE_MARGIN + buttonHeight + GAP + panelHeight
      : EDGE_MARGIN + buttonHeight;
    onOccupiedHeightChange(occupied);
  }, [isMobile, isOpen, onOccupiedHeightChange]);

  // Commit measurement to make sure in correct position
  useLayoutEffect(() => {
    reportHeight();
    window.addEventListener("resize", reportHeight);
    return () => window.removeEventListener("resize", reportHeight);
  }, [reportHeight]);

  const wrapperStyle = isMobile
    ? {
        position: "fixed",
        bottom: `${EDGE_MARGIN}px`,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 6,
      }
    : {
        position: "absolute",
        top: "34px",
        right: "40px",
        zIndex: 6,
      };

  const panelStyle = isMobile
    ? {
        position: "absolute",
        bottom: `calc(100% + ${GAP}px)`,
        left: "50%",
        transform: isOpen ? "translate(-50%, 0)" : "translate(-50%, 100%)",
      }
    : {
        position: "absolute",
        top: `calc(100% + ${GAP}px)`,
        right: 0,
        transform: isOpen ? "translateY(0)" : "translateY(-100%)",
      };

  return (
    <div style={wrapperStyle}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide map functions" : "Show map functions"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 14px",
          background: "var(--parchment)",
          border: "1.5px solid var(--ink)",
          borderRadius: "999px",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontStyle: "italic",
          letterSpacing: "1px",
          color: "var(--ink)",
        }}
      >
        Functions
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      <div
        ref={panelRef}
        aria-hidden={!isOpen}
        style={{
          ...panelStyle,
          width: "220px",
          maxWidth: "calc(100vw - 64px)",
          padding: "14px",
          background: "var(--parchment)",
          border: "1.5px solid var(--ink)",
          borderRadius: "8px",
          opacity: isOpen ? 1 : 0,
          transition:
            "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <ThemeSwitcher />
      </div>
    </div>
  );
}

export default FunctionsDrawer;
