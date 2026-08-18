import { useEffect, useMemo, useRef } from "react";
import { buildRope, buildRopeFromPoints } from "../utils/rope";
import { createRope, stepRope } from "../utils/verletRope";

const WIDTH = 82;
const HEIGHT = 188;
const CX = 41;
const CY = 23;

// Anchor or rope to the functions drawer
const ANCHOR = { x: CX, y: CY };

// Rope constants
const NODE_COUNT = 12;
const ROPE_LENGTH = 120;
const SEGMENT_LENGTH = ROPE_LENGTH / (NODE_COUNT - 1);
const ROPE_THICKNESS = 10;
// How many overlapping quads buildRopeFromPoints() produces for a chain of
const ROPE_SEGMENT_COUNT = NODE_COUNT - 1;

// applied as gravity*dt^2 each step
const GRAVITY = 700;
// Higher damping = more friction
const DAMPING = 0.9;
const CONSTRAINT_ITERATIONS = 8;

// Constant for effect of cursor on rope
const CURSOR_RADIUS = 10; // how close counts as "nearby"
const CURSOR_STRENGTH = 2; // how hard a nearby node gets pushed
// How far the tip can be pinned from the anchor while dragging.
const MAX_PIN_DISTANCE = ROPE_LENGTH * 0.95;

const RING_R = 5.8;
const COIL_R = 9;

const COIL_THICKNESS = 5.5;

const STRAND_COUNT = 7;
const MAX_SPREAD = 18;
const MAX_DROP = 36;

function circlePathD(cx, cy, r) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${
    cx + r
  } ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
}

// Build the ring and rope once, relative to a local (0,0)
// Whenever drawer moves, move the whole group, not rebuilding and rerendering the strands every time
function buildStaticParts() {
  const coil = buildRope(circlePathD(ANCHOR.x, ANCHOR.y - COIL_R, COIL_R), {
    step: 3.5,
    thickness: COIL_THICKNESS,
    fixGaps: true,
  });

  const fringe = Array.from({ length: STRAND_COUNT }, (_, i) => {
    const t = i / (STRAND_COUNT - 1);
    const centered = t - 0.5; // -0.5 (leftmost) .. 0.5 (rightmost)

    const tipX = centered * MAX_SPREAD * 2;
    const tipY = 2 + MAX_DROP * (1 - Math.abs(centered) * 0.45);
    const bulge = centered * MAX_SPREAD * 0.9;
    const midY = 2 + (tipY - 2) * 0.5;
    const d = `M 0 2 Q ${bulge} ${midY} ${tipX} ${tipY}`;
    const thickness = 4.2 - Math.abs(centered) * 2.4;

    return {
      key: `fringe-${i}`,
      segments: buildRope(d, { step: 3.5, thickness, fixGaps: true }),
    };
  });

  return { coil, fringe };
}

function CurtainTassel({
  strandColor,
  knotColor,
  isPulling,
  onPullStart,
  onPullMove,
  onPullEnd,
}) {
  const svgRef = useRef(null);
  const ropePathRefs = useRef([]);
  const tasselGroupRef = useRef(null);
  const nodesRef = useRef(null);
  const cursorRef = useRef(null); // local {x,y}, or null when not tracked
  const dragRef = useRef(null); // {startClientY} while actively pulling
  const isPullingRef = useRef(isPulling);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  const { coil, fringe } = useMemo(() => buildStaticParts(), []);

  useEffect(() => {
    nodesRef.current = createRope(ANCHOR, NODE_COUNT, SEGMENT_LENGTH);
  }, []);

  useEffect(() => {
    isPullingRef.current = isPulling;
  }, [isPulling]);

  useEffect(() => {
    function frame(time) {
      const dt = lastTimeRef.current
        ? Math.min((time - lastTimeRef.current) / 1000, 0.032)
        : 1 / 60;
      lastTimeRef.current = time;

      const nodes = nodesRef.current;
      const anchorNode = nodes[0];
      anchorNode.x = ANCHOR.x;
      anchorNode.y = ANCHOR.y;
      anchorNode.pinned = true;

      const tip = nodes[nodes.length - 1];
      if (isPullingRef.current && cursorRef.current) {
        // Pin the tip directly to the cursor while pulling, clamped to a maximum reach/distance
        const dx = cursorRef.current.x - ANCHOR.x;
        const dy = cursorRef.current.y - ANCHOR.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const clamped = Math.min(dist, MAX_PIN_DISTANCE);
        tip.pinned = true;
        tip.x = ANCHOR.x + (dx / dist) * clamped;
        tip.y = ANCHOR.y + (dy / dist) * clamped;
      } else {
        tip.pinned = false;
      }

      stepRope(nodes, {
        gravity: GRAVITY * dt * dt,
        damping: DAMPING,
        segmentLength: SEGMENT_LENGTH,
        iterations: CONSTRAINT_ITERATIONS,
        cursor: cursorRef.current,
        cursorRadius: CURSOR_RADIUS,
        cursorStrength: CURSOR_STRENGTH,
      });

      const points = nodes.map((n) => ({ x: n.x, y: n.y }));
      const segments = buildRopeFromPoints(points, ROPE_THICKNESS, true);
      segments.forEach((seg, i) => {
        ropePathRefs.current[i]?.setAttribute("d", seg.pathD);
      });

      const secondLast = nodes[nodes.length - 2];
      const angleRad = Math.atan2(tip.y - secondLast.y, tip.x - secondLast.x);
      const rotationDeg = (angleRad - Math.PI / 2) * (180 / Math.PI);
      tasselGroupRef.current?.setAttribute(
        "transform",
        `translate(${tip.x} ${tip.y}) rotate(${rotationDeg})`
      );

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Convert to local units for the physics
  const toLocal = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (WIDTH / rect.width),
      y: (e.clientY - rect.top) * (HEIGHT / rect.height),
    };
  };

  const handlePointerMove = (e) => {
    cursorRef.current = toLocal(e);
    if (dragRef.current) onPullMove?.(e.clientY - dragRef.current.startClientY);
  };

  const handlePointerDown = (e) => {
    dragRef.current = { startClientY: e.clientY };
    cursorRef.current = toLocal(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    onPullStart?.();
  };

  const handlePointerUp = (e) => {
    e.currentTarget.style.cursor = "grab";
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startClientY;
    dragRef.current = null;
    onPullEnd?.(delta);
  };

  const handlePointerLeave = () => {
    // Only clear the ambient cursor tracking if we're not mid-drag
    if (!dragRef.current) cursorRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{
        display: "block",
        overflow: "visible",
        touchAction: "none",
        pointerEvents: "auto",
        cursor: "grab",
      }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <g stroke="var(--ink)" strokeWidth="1" strokeLinejoin="round">
        <g fill={strandColor}>
          {Array.from({ length: ROPE_SEGMENT_COUNT }).map((_, i) => (
            <path key={i} ref={(el) => (ropePathRefs.current[i] = el)} />
          ))}
        </g>
        <g ref={tasselGroupRef}>
          {fringe.map((strand) =>
            strand.segments.map((seg, i) => (
              <path
                key={`${strand.key}-${i}`}
                d={seg.pathD}
                fill={strandColor}
              />
            ))
          )}
          <circle
            cx={0}
            cy={0}
            r={RING_R}
            fill="none"
            stroke={knotColor}
            strokeWidth="2.8"
          />
        </g>
        {coil.map((seg, i) => (
          <path key={`coil-${i}`} d={seg.pathD} fill={knotColor} />
        ))}
      </g>
    </svg>
  );
}

export default CurtainTassel;
