/**
 * Draws a theatre's marker on SVG map, with a label
 */

function TheatreMarker({ theatre, labelPos, isSelected, onSelect }) {
  const size = isSelected ? 14 : 10;
  const half = size / 2;

  const dx = labelPos.x - theatre.x;
  const dy = labelPos.y - theatre.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const needsLeader = distance > 22;

  return (
    <g onClick={onSelect} style={{ cursor: "pointer" }}>
      {isSelected && (
        <circle
          cx={theatre.x}
          cy={theatre.y}
          r="16"
          style={{ fill: "none", stroke: "var(--curtain-red)" }}
          strokeWidth="0.75"
          opacity="0.35"
        />
      )}
      <rect
        x={theatre.x - half}
        y={theatre.y - half}
        width={size}
        height={size}
        style={{ fill: "var(--curtain-red)", stroke: "var(--ink)" }}
        strokeWidth={isSelected ? 1.25 : 0.75}
        opacity={isSelected ? 1 : 0.85}
      />
      {needsLeader && (
        <line
          x1={theatre.x}
          y1={theatre.y}
          x2={labelPos.x}
          y2={labelPos.y - 4}
          style={{ stroke: "var(--ink)" }}
          strokeWidth="0.5"
          opacity="0.4"
        />
      )}
      {/* Soft backing plate behind the label, instead of a thick text
          stroke - a stroke halo this size on a cursive italic font makes
          adjacent letters bleed into each other; a plain rectangle behind
          the word achieves the same "stays legible over map lines" goal
          without that side effect */}
      <rect
        x={labelPos.x - labelPos.width / 2 - 3}
        y={labelPos.y - labelPos.height}
        width={labelPos.width + 6}
        height={labelPos.height + 4}
        style={{ fill: "var(--parchment)" }}
        opacity="0.85"
      />
      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-body)", fill: "var(--ink)" }}
        fontStyle="italic"
        fontSize="13"
      >
        {theatre.name}
      </text>
    </g>
  );
}

export default TheatreMarker;
