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

export function projectToCanvas(theatre, bounds, canvas) {
  const xRatio =
    (theatre.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  // lat increases going north, but screen y increases going down —
  // so this axis has to be flipped, or the map renders upside down.
  const yRatio =
    (theatre.lat - bounds.maxLat) / (bounds.minLat - bounds.maxLat);

  return {
    x: canvas.marginX + xRatio * (canvas.width - canvas.marginX * 2),
    y: canvas.marginY + yRatio * (canvas.height - canvas.marginY * 2),
  };
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
