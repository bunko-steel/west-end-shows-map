// Converts a theatre's real lat/lng into an x/y position inside our
// world coordinate space.
export function projectPoint(lat, lng, bounds, canvas) {
  const xRatio = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const yRatio = (lat - bounds.maxLat) / (bounds.minLat - bounds.maxLat);
  return {
    x: canvas.marginX + xRatio * (canvas.width - canvas.marginX * 2),
    y: canvas.marginY + yRatio * (canvas.height - canvas.marginY * 2),
  };
}

export function projectToCanvas(theatre, bounds, canvas) {
  return projectPoint(theatre.lat, theatre.lng, bounds, canvas);
}

export function pointsToPath(points, bounds, canvas, close = false) {
  const path = points
    .map(([lat, lng], i) => {
      const { x, y } = projectPoint(lat, lng, bounds, canvas);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return close ? `${path} Z` : path;
}

// Bounding box around the theatres to figure out how much of world map to display
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

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Bounds for the initial view so that we dont look at unrendered parts of the map
// Exclude outlier theatres in these calculations
export function getCoreBounds(theatres, exclusionPercent = 5) {
  const medianLat = median(theatres.map((t) => t.lat));
  const medianLng = median(theatres.map((t) => t.lng));
  const cosLat = Math.cos((medianLat * Math.PI) / 180);

  const byDistance = theatres
    .map((theatre) => {
      const dLat = theatre.lat - medianLat;
      const dLng = (theatre.lng - medianLng) * cosLat;
      return { theatre, dist: Math.sqrt(dLat * dLat + dLng * dLng) };
    })
    .sort((a, b) => a.dist - b.dist);

  const keepCount = Math.ceil(byDistance.length * (1 - exclusionPercent / 100));
  const core = byDistance.slice(0, keepCount).map((entry) => entry.theatre);

  return getBounds(core);
}

// Figures out the right canvas aspect ratio from real coordinates,
// correcting for the fact that longitude degrees are "narrower" than
// latitude degrees this far from the equator.
export function getCanvasDimensions(bounds, targetWidth = 900) {
  const avgLatRad = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const lngSpan = bounds.maxLng - bounds.minLng;
  const latSpan = bounds.maxLat - bounds.minLat;
  const correctedLngSpan = lngSpan * Math.cos(avgLatRad);
  const aspectRatio = latSpan / correctedLngSpan;
  return {
    width: targetWidth,
    height: Math.round(targetWidth * aspectRatio),
  };
}
