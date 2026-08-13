import { themes } from "../themes";
import { useTheme } from "../context/ThemeContext";

// Gives a swartch of the colours for that theme/palette
function swatchGradient(theme) {
  const { colors } = theme;
  const slice = [
    colors["--water"],
    colors["--curtain-red"],
    colors["--brass"],
    colors["--park"],
  ];
  return `conic-gradient(${slice.join(", ")})`;
}

function ThemeSwitcher() {
  const { themeId, setThemeId } = useTheme();

  return (
    <div
      style={{
        position: "absolute",
        top: "34px",
        right: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
        zIndex: 5,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontStyle: "italic",
          letterSpacing: "1px",
          color: "var(--ink)",
          opacity: 0.75,
          pointerEvents: "none",
        }}
      >
        Palette
      </span>
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "7px",
          background: "var(--parchment)",
          border: "1.5px solid var(--ink)",
          borderRadius: "999px",
        }}
      >
        {Object.entries(themes).map(([id, theme]) => {
          const isActive = id === themeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setThemeId(id)}
              title={theme.label}
              aria-label={`Switch to ${theme.label} colour scheme`}
              aria-pressed={isActive}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                padding: 0,
                cursor: "pointer",
                background: swatchGradient(theme),
                border: isActive
                  ? "2px solid var(--curtain-red)"
                  : "1.5px solid rgba(0, 0, 0, 0.25)",
                boxShadow: isActive ? "0 0 0 2px var(--parchment)" : "none",
                outlineOffset: "2px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSwitcher;
