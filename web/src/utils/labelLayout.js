import { forceSimulation, forceX, forceY } from "d3-force";

// Rough estimate of rendered text width without needing to measure the
// actual DOM - good enough for collision detection, doesn't need to be exact.
function estimateLabelWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

// Resolves overlaps between label bounding boxes directly (rectangle vs.
// rectangle), rather than approximating each label as a circle. A circle
// sized to fit a wide label wastes a lot of space above/below it, which was
// causing labels to get shoved away even when they didn't really overlap.
// Only nudges nodes along whichever axis needs the smaller correction, and
// only by as much as the actual overlap requires.
function forceRectCollide(padding = 1, strength = 0.5) {
  let nodes;

  function force() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
        const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const push = (overlapX / 2) * strength * (dx < 0 ? -1 : 1);
          a.x -= push;
          b.x += push;
        } else {
          const push = (overlapY / 2) * strength * (dy < 0 ? -1 : 1);
          a.y -= push;
          b.y += push;
        }
      }
    }
  }

  force.initialize = (_nodes) => {
    nodes = _nodes;
  };

  return force;
}

// Given theatres already positioned on the canvas, figures out where each
// theatre's NAME LABEL should sit so labels don't overlap each other -
// separate from the marker's own position, which never moves.
export function resolveLabelPositions(theatres, fontSize = 13) {
  const nodes = theatres.map((t) => ({
    id: t.id,
    anchorX: t.x,
    anchorY: t.y + 18, // same offset the old fixed layout used
    x: t.x,
    y: t.y + 18, // starting guess
    width: estimateLabelWidth(t.name, fontSize),
    height: fontSize + 4,
  }));

  const simulation = forceSimulation(nodes)
    // Pulls each label back toward its own marker - kept fairly strong so
    // labels only move as far as they need to to stop overlapping, rather
    // than drifting away from their marker.
    .force("x", forceX((d) => d.anchorX).strength(0.4))
    .force("y", forceY((d) => d.anchorY).strength(0.4))
    .force("collide", forceRectCollide())
    .stop();

  // The map is static once built, so we don't need to animate this - just
  // run all 300 physics steps at once and grab the final settled result.
  for (let i = 0; i < 300; i++) simulation.tick();

  const positions = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.x, y: node.y };
  }
  return positions;
}
