// Converts a theatre's real lat/lng into an x/y position inside our
// illustration's canvas. bounds is computed from the actual data, so
// this keeps working even if you add or remove theatres later.
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
  const xRatio = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const yRatio = (lat - bounds.maxLat) / (bounds.minLat - bounds.maxLat);

  return {
    x: canvas.marginX + xRatio * (canvas.width - canvas.marginX * 2),
    y: canvas.marginY + yRatio * (canvas.height - canvas.marginY * 2),
  };
}

// Theatres are just a single-point special case of the same projection.
export function projectToCanvas(theatre, bounds, canvas) {
  return projectPoint(theatre.lat, theatre.lng, bounds, canvas);
}

// Converts an array of [lat, lng] points into an SVG path "d" string.
export function pointsToPath(points, bounds, canvas) {
  return points
    .map(([lat, lng], i) => {
      const { x, y } = projectPoint(lat, lng, bounds, canvas);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// Figures out the right canvas aspect ratio from the real coordinates,
// correcting for the fact that longitude degrees are "narrower" than
// latitude degrees this far from the equator. Skip this and the map
// looks visibly squashed east-west.
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
