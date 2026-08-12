import { forceSimulation, forceX, forceY } from "d3-force";

function estimateLabelWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

const MARKER_SIZE = 14;

function forceRectCollide(padding = 1, strength = 0.5) {
  let nodes;

  function force() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        if (a.fixed && b.fixed) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
        const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const push = (overlapX / 2) * strength * (dx < 0 ? -1 : 1);
          if (!a.fixed) a.x -= push;
          if (!b.fixed) b.x += push;
        } else {
          const push = (overlapY / 2) * strength * (dy < 0 ? -1 : 1);
          if (!a.fixed) a.y -= push;
          if (!b.fixed) b.y += push;
        }
      }
    }
  }

  force.initialize = (_nodes) => {
    nodes = _nodes;
  };

  return force;
}

export function resolveLabelPositions(theatres, fontSize = 13) {
  const labelNodes = theatres.map((t) => ({
    id: t.id,
    fixed: false,
    anchorX: t.x,
    anchorY: t.y,
    x: t.x + (Math.random() - 0.5) * 4,
    y: t.y + (Math.random() - 0.5) * 4,
    width: estimateLabelWidth(t.name, fontSize),
    height: fontSize + 4,
  }));

  const markerNodes = theatres.map((t) => ({
    id: `marker-${t.id}`,
    fixed: true,
    anchorX: t.x,
    anchorY: t.y,
    x: t.x,
    y: t.y,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  }));

  const nodes = [...labelNodes, ...markerNodes];

  const simulation = forceSimulation(nodes)
    .force(
      "x",
      forceX((d) => d.anchorX).strength((d) => (d.fixed ? 0 : 0.4))
    )
    .force(
      "y",
      forceY((d) => d.anchorY).strength((d) => (d.fixed ? 0 : 0.4))
    )
    .force("collide", forceRectCollide(2, 0.5))
    .stop();

  for (let i = 0; i < 600; i++) simulation.tick();

  const MAX_DISTANCE = 90;
  for (const node of labelNodes) {
    const dx = node.x - node.anchorX;
    const dy = node.y - node.anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_DISTANCE) {
      const scale = MAX_DISTANCE / dist;
      node.x = node.anchorX + dx * scale;
      node.y = node.anchorY + dy * scale;
    }
  }

  // Prevent overlap by re-running collision on fixed positions of labels
  const cleanup = forceRectCollide(2, 0.5);
  cleanup.initialize(nodes);
  for (let i = 0; i < 100; i++) cleanup();

  const positions = {};
  for (const node of labelNodes) {
    positions[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
  }
  return positions;
}
