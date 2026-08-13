import { createContext, useContext, useLayoutEffect, useState } from "react";
import { themes, defaultThemeId } from "../themes";

const STORAGE_KEY = "west-end-theme";

// Fall back on default theme if need to
function readStoredThemeId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && themes[stored] ? stored : defaultThemeId;
  } catch {
    return defaultThemeId;
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(readStoredThemeId);

  // useLayoutEffect so the variables are applied before the browser paints
  useLayoutEffect(() => {
    const theme = themes[themeId] ?? themes[defaultThemeId];
    const root = document.documentElement;
    for (const [property, value] of Object.entries(theme.colors)) {
      // Overrides defaults in index.css
      root.style.setProperty(property, value);
    }
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {}
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
