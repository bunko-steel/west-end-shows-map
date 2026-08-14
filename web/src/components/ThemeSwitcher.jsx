import { themes } from "../themes";
import { useTheme } from "../context/ThemeContext";

// Gives a swatch for the colours in that palette
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
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontStyle: "italic",
          letterSpacing: "1px",
          color: "var(--ink)",
          opacity: 0.75,
        }}
      >
        Palette
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
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
