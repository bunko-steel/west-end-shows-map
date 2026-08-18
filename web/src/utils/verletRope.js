// A minimal Verlet-integration rope: a chain of point-masses connected by
// fixed-length constraints, with gravity, damping, and a pin at each end.

// Each point remembers where it was in the last frame (implicit velocity:
// current position - previous position), nudged by gravity + distance constraint
// enforced between neighbors until the whole chain relaxes into something
// plausible

/**
 * @param {{x:number,y:number}} anchor - where the rope is tied off
 * @param {number} nodeCount
 * @param {number} segmentLength - rest length between adjacent nodes
 * @returns {object[]} nodes, hanging straight down from the anchor
 */
export function createRope(anchor, nodeCount, segmentLength) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const x = anchor.x;
    const y = anchor.y + i * segmentLength;
    nodes.push({ x, y, px: x, py: y, pinned: i === 0 });
  }
  return nodes;
}

/**
 * Advances the simulation by one step, mutating `nodes` in place.
 *
 * @param {object[]} nodes
 * @param {object} params
 * @param {number} params.gravity - downward acceleration for this step
 *   (already multiplied by dt^2 by the caller - see the note in
 *   CurtainTassel.jsx on why dt belongs there, not in here)
 * @param {number} params.damping - velocity retained per step (e.g. 0.98)
 * @param {number} params.segmentLength
 * @param {number} params.iterations - constraint-solver passes per step;
 *   more = stiffer/more accurate rope, at linear cost
 * @param {{x:number,y:number}|null} params.cursor - local coordinates, or
 *   null if the pointer isn't nearby
 * @param {number} params.cursorRadius - how close counts as "nearby"
 * @param {number} params.cursorStrength - how hard nearby nodes get pushed
 */
export function stepRope(
  nodes,
  {
    gravity,
    damping,
    segmentLength,
    iterations,
    cursor,
    cursorRadius,
    cursorStrength,
  }
) {
  for (const node of nodes) {
    if (node.pinned) continue;

    const vx = (node.x - node.px) * damping;
    const vy = (node.y - node.py) * damping;
    node.px = node.x;
    node.py = node.y;
    node.x += vx;
    node.y += vy + gravity;

    if (cursor) {
      const dx = node.x - cursor.x;
      const dy = node.y - cursor.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      if (dist < cursorRadius) {
        const push = ((cursorRadius - dist) / cursorRadius) * cursorStrength;
        node.x += (dx / dist) * push;
        node.y += (dy / dist) * push;
      }
    }
  }

  // Distance constraints: pull each adjacent pair back to exactly
  // segmentLength apart, splitting the correction between both ends
  // (unless one is pinned, which takes the full correction on the other).
  // Repeating this several times per frame is what keeps the rope from
  // stretching like elastic under gravity or a hard pull.
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const diff = (dist - segmentLength) / dist;
      const offsetX = dx * 0.5 * diff;
      const offsetY = dy * 0.5 * diff;

      if (!a.pinned) {
        a.x += offsetX;
        a.y += offsetY;
      }
      if (!b.pinned) {
        b.x -= offsetX;
        b.y -= offsetY;
      }
    }
  }
}
