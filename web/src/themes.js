/**
 * Named colour schemes for the map.
 */
export const themes = {
  classic: {
    label: "Classic Playbill",
    colors: {
      "--parchment": "#f2ebda",
      "--ink": "#1b1712",
      "--brass": "#a8752c",
      "--water": "#9fc1c6",
      "--park": "#9cb68c",
      "--curtain-red": "#8c1d2b",
      "--cream": "#ede3cc",
    },
    opacity: {
      water: 0.6,
      park: 0.5,
      roadMain: 0.7,
      roadMinor: 0.4,
      roundabout: 0.3,
    },
  },
  mosaic: {
    label: "Mosaic Marquee",
    colors: {
      "--parchment": "#f5efdc",
      "--ink": "#182848",
      "--brass": "#dd8b2e",
      "--water": "#3e7cb1",
      "--park": "#3e8859",
      "--curtain-red": "#d64a2e",
      "--cream": "#f7ecd6",
    },
    opacity: {
      water: 0.85,
      park: 0.75,
      roadMain: 0.85,
      roadMinor: 0.55,
      roundabout: 0.55,
    },
  },
};

export const defaultThemeId = "classic";
