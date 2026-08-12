import { forceSimulation, forceX, forceY } from "d3-force";

// Rough estimate of rendered text width
function estimateLabelWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

// Resolves overlaps between label bounding boxes
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
// theatre's label should sit so labels don't overlap each other
export function resolveLabelPositions(theatres, fontSize = 13) {
  const nodes = theatres.map((t) => ({
    id: t.id,
    anchorX: t.x,
    anchorY: t.y,
    x: t.x + (Math.random() - 0.5) * 0.01,
    y: t.y + 18 + (Math.random() - 0.5) * 0.01,
    width: estimateLabelWidth(t.name, fontSize),
    height: fontSize + 4,
  }));

  const simulation = forceSimulation(nodes)
    // Pulls each label back toward its own marker
    .force("x", forceX((d) => d.anchorX).strength(0.4))
    .force("y", forceY((d) => d.anchorY).strength(0.4))
    .force("collide", forceRectCollide())
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  const positions = {};
  for (const node of nodes) {
    positions[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
  }
  return positions;
}
