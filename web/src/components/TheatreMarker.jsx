function TheatreMarker({ theatre, isSelected, onSelect }) {
  const radius = isSelected ? 7 : 5;

  return (
    <g onClick={onSelect} style={{ cursor: "pointer" }}>
      {isSelected && (
        <circle
          cx={theatre.x}
          cy={theatre.y}
          r="13"
          style={{ fill: "none", stroke: "var(--gold)" }}
          strokeWidth="0.75"
          opacity="0.5"
        />
      )}
      <circle
        cx={theatre.x}
        cy={theatre.y}
        r={radius}
        style={{
          fill: isSelected ? "var(--gold)" : "var(--ink)",
          stroke: isSelected ? "var(--cream)" : "var(--gold)",
        }}
        strokeWidth={isSelected ? 1 : 1.5}
      />
      <text
        x={theatre.x}
        y={theatre.y + 18}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-body)", fill: "var(--cream)" }}
        fontStyle="italic"
        fontSize="12"
      >
        {theatre.name}
      </text>
    </g>
  );
}

export default TheatreMarker;
