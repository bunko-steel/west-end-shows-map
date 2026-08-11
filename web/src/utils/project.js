// Converts a theatre's real lat/long into an x/y position inside canvas
// Bounds computed from actual data
export function getBounds(theatres) {
  const lats = theatres.map((t) => t.lat);
  const lngs = theatres.map((t) => t.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export function projectPoint(lat, lng, bounds, canvas) {
  // Compute where point falls as a 0-1 ratio within bounding box
  const xRatio = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const yRatio = (lat - bounds.maxLat) / (bounds.minLat - bounds.maxLat);

  // Map this ratio into pixel space
  return {
    x: canvas.marginX + xRatio * (canvas.width - canvas.marginX * 2),
    y: canvas.marginY + yRatio * (canvas.height - canvas.marginY * 2),
  };
}

// Calls projectPoint with a theatre's own lat/long to get its x/y position
export function projectToCanvas(theatre, bounds, canvas) {
  return projectPoint(theatre.lat, theatre.lng, bounds, canvas);
}

// Converts an array of [lat, lng] points into an SVG path "d" string
export function pointsToPath(points, bounds, canvas, close = false) {
  const path = points
    .map(([lat, lng], i) => {
      const { x, y } = projectPoint(lat, lng, bounds, canvas);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return close ? `${path} Z` : path;
}

// Function to figure out the right canvas aspect ratio from the real coordinates
// Corrects for the fact that longitude degrees are "narrower" than latitude degrees this far from the equator
export function getCanvasDimensions(bounds, targetWidth = 900) {
  const avgLatRad = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const lngSpan = bounds.maxLng - bounds.minLng;
  const latSpan = bounds.maxLat - bounds.minLat;
  const correctedLngSpan = lngSpan * Math.cos(avgLatRad);
  const aspectRatio = latSpan / correctedLngSpan; // height ÷ width

  return {
    width: targetWidth,
    height: Math.round(targetWidth * aspectRatio),
  };
}
