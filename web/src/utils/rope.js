// Renders a smooth, rounded "rope" ribbon along an SVG path
// Used for the curtain tassel cords, but usable in general
//
// The method: sample points along the path, find the outward-facing normal at
// each point (perpendicular to the path, offset by half the thickness), then
// stitch each pair of consecutive normals into a filled quad. Corners are
// rounded with Chaikin's corner-cutting algorithm so the ribbon curves
// smoothly instead of kinking at each sample point. Adjacent quads overlap
// slightly by design, which is what avoids pinching/gaps at bends.

// ----- vectors ----- //

function multiplyVector(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar };
}

function getVector(a, b) {
  return { x: b.x - a.x, y: b.y - a.y };
}

function addVectors(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function getPointOnLine(start, end, ratio) {
  const v = multiplyVector(getVector(start, end), ratio);
  return { x: start.x + v.x, y: start.y + v.y };
}

function getAngleBetweenThreePoints(a, b, c) {
  const vectorBA = getVector(a, b);
  const vectorBC = getVector(c, b);
  return (
    Math.atan2(vectorBC.y, vectorBC.x) - Math.atan2(vectorBA.y, vectorBA.x)
  );
}

// ----- Chaikin's corner-cutting algorithm ----- //
// Repeatedly cuts each corner of a polyline; a few iterations converge on a
// smooth curve without needing a full spline implementation.

function cut(start, end, ratio) {
  const r1 = {
    x: start.x * (1 - ratio) + end.x * ratio,
    y: start.y * (1 - ratio) + end.y * ratio,
  };
  const r2 = {
    x: start.x * ratio + end.x * (1 - ratio),
    y: start.y * ratio + end.y * (1 - ratio),
  };
  return [r1, r2];
}

export function chaikin(curve, iterations = 1, closed = false, ratio = 0.25) {
  if (ratio > 0.5) ratio = 1 - ratio;

  for (let i = 0; i < iterations; i++) {
    let refined = [curve[0]];

    for (let j = 1; j < curve.length; j++) {
      refined = refined.concat(cut(curve[j - 1], curve[j], ratio));
    }

    if (closed) {
      refined.shift();
      refined = refined.concat(cut(curve[curve.length - 1], curve[0], ratio));
    } else {
      refined.push(curve[curve.length - 1]);
    }

    curve = refined;
  }
  return curve;
}

// ----- sampling the path ----- //

// Walks an SVG path at fixed-length intervals and returns evenly spaced points
function samplePath(d, step) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);

  const length = path.getTotalLength();
  const count = length / step;
  const points = [];

  for (let i = 0; i < count + 1; i++) {
    points.push(path.getPointAtLength(i * step));
  }

  return points;
}

// Adds one extrapolated point at each end of a polyline, so the first/last
// real point has a direction to work with when getOuterPoints() looks at
// its neighbours.
function extendEndpoints(points) {
  const vectorStart = getVector(points[1], points[0]);
  const vectorEnd = getVector(
    points[points.length - 2],
    points[points.length - 1]
  );

  return [
    addVectors(points[0], vectorStart),
    ...points,
    addVectors(points[points.length - 1], vectorEnd),
  ];
}

// Given three consecutive points, returns the two points "thickness" apart
// that straddle the middle point along the bisector of the angle it makes,
// so the left/right edge of the ribbon at that point.
function getOuterPoints(v1, v2, v3, thickness) {
  const angle1 = getAngleBetweenThreePoints(v1, v2, v3) / 2;
  const offset = angle1 > 0 ? -1 : 1;
  const angle2 = getAngleBetweenThreePoints(v1, v2, {
    x: v2.x + offset,
    y: v2.y,
  });
  const angle = angle2 - angle1;
  const r = thickness / 2;

  return [
    { x: v2.x + Math.cos(angle) * r, y: v2.y - Math.sin(angle) * r },
    {
      x: v2.x + Math.cos(angle + Math.PI) * r,
      y: v2.y - Math.sin(angle + Math.PI) * r,
    },
  ];
}

function getLines(points, thickness) {
  const normals = [];
  for (let i = 1; i < points.length - 1; i++) {
    normals.push(
      getOuterPoints(points[i - 1], points[i], points[i + 1], thickness)
    );
  }
  normals.push(normals[normals.length - 1]);
  return normals;
}

// Stitches consecutive normal pairs into overlapping, corner-rounded quads.
// fixGaps duplicates the shared corner point on both sides of a seam -
// slightly more overdraw, but no visible hairline gaps, which matters more
// at icon scale than it does on a big canvas rope.
function getSegments(normals, fixGaps) {
  const segments = [];

  for (let i = 0; i < normals.length - 2; i++) {
    const [A, B] = normals[i];
    const [C, D] = normals[i + 1];
    const [E] = normals[i + 2];

    const prevSegment = segments[i - 1];

    const ratio1 = 0.3;
    const ratio2 = 1 - ratio1;

    const BD033 = getPointOnLine(B, D, 0.33);
    const DC_p1 = getPointOnLine(D, C, ratio1);
    let corner1 = getPointOnLine(BD033, DC_p1, 0.5);
    corner1 = addVectors(corner1, multiplyVector(getVector(corner1, D), 0.25));

    const DC_p2 = getPointOnLine(D, C, ratio2);
    const CE066 = getPointOnLine(C, E, 0.66);
    let corner2 = getPointOnLine(DC_p2, CE066, 0.5);
    corner2 = addVectors(corner2, multiplyVector(getVector(corner2, C), 0.25));

    const AC066 = getPointOnLine(A, C, 0.66);
    const AB_p1 = getPointOnLine(A, B, ratio1);
    const AB_p2 = getPointOnLine(A, B, ratio2);

    const edge1 = [
      prevSegment ? prevSegment.edge1[2] : B,
      BD033,
      corner1,
      fixGaps ? corner1 : null,
      fixGaps ? corner1 : null,
      DC_p1,
      DC_p2,
      corner2,
    ].filter(Boolean);

    const edge2 = [
      corner2,
      AC066,
      prevSegment ? prevSegment.edge1[fixGaps ? 7 : 5] : null,
      prevSegment && fixGaps ? prevSegment.edge1[7] : null,
      prevSegment && fixGaps ? prevSegment.edge1[7] : null,
      AB_p1,
      prevSegment ? AB_p2 : null,
      prevSegment ? prevSegment.edge1[2] : B,
    ].filter(Boolean);

    const roundedEdge1 = chaikin(edge1, 2, false, 0.25);
    const roundedEdge2 = chaikin(edge2, 2, false, 0.25);
    roundedEdge1.pop();
    roundedEdge2.pop();

    segments.push({ edge1, points: [...roundedEdge1, ...roundedEdge2] });
  }

  return segments;
}

function segmentPathD(points) {
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
}

/**
 * Turns a sequence of real points (e.g. from a physics simulation) into a
 * rope, the same way buildRope() does for a path string - skipping the
 * SVG-path-string-and-DOM-length-sampling round trip, since the caller
 * already has real coordinates. Matters when this runs every animation
 * frame: creating a detached <path>, forcing layout via getTotalLength(),
 * then walking it with getPointAtLength() a dozen times is real work to
 * redo 60 times a second for points you already have in hand.
 *
 * @param {{x:number,y:number}[]} points - at least 4 points
 * @param {number} thickness
 * @param {boolean} fixGaps
 * @returns {{ pathD: string }[]}
 */
export function buildRopeFromPoints(points, thickness, fixGaps = false) {
  const normals = getLines(extendEndpoints(points), thickness);
  const segments = getSegments(normals, fixGaps);
  return segments.map((segment) => ({ pathD: segmentPathD(segment.points) }));
}

/**
 * Turns an SVG path string into a rope: a list of overlapping filled
 * polygons (as ready-to-use path `d` strings) that together render as a
 * smooth, rounded ribbon of the given thickness following that path.
 *
 * @param {string} d - an SVG path, e.g. from a template string
 * @param {object} options
 * @param {number} options.step - sample interval in px along the path.
 *   Smaller = smoother curve, more polygons. ~8-10 for a big canvas rope,
 *   ~2-3 for a small icon-scale cord.
 * @param {number} options.thickness - ribbon width in px
 * @param {boolean} options.fixGaps - see getSegments() above
 * @returns {{ pathD: string }[]}
 */
export function buildRope(d, options = {}) {
  const { step = 8, thickness = 12, fixGaps = false } = options;
  return buildRopeFromPoints(samplePath(d, step), thickness, fixGaps);
}
