// Deterministic string hash for theatre id
function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

// Decorative barcode for the theatre description
// Doesn't encode anything, purely decorative
function DecorativeBarcode({ seed, width = 34, height = 46 }) {
  const bars = [];
  let x = 0;
  let s = hashSeed(seed);
  while (x < width) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const barWidth = 1 + (s % 3);
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const gap = 1 + (s % 2);
    if (x + barWidth <= width) bars.push({ x, w: barWidth });
    x += barWidth + gap;
  }
  return (
    <svg width={width} height={height} aria-hidden="true">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={0}
          width={bar.w}
          height={height}
          fill="var(--cream)"
        />
      ))}
    </svg>
  );
}

// Data format: "<Theatre Name>, <Street>, London"
// Drops leading segment if name is duplicated
function locationLine(theatre) {
  if (!theatre.address) return null;
  const parts = theatre.address.split(",").map((p) => p.trim());
  const rest = parts[0] === theatre.name ? parts.slice(1) : parts;
  const text = rest.join(", ");
  return text || null;
}

const fieldLabelStyle = {
  display: "block",
  fontFamily: "var(--mono)",
  fontSize: "8.5px",
  letterSpacing: "1px",
  opacity: 0.65,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const fieldValueStyle = {
  display: "block",
  fontFamily: "var(--mono)",
  fontSize: "11px",
  marginTop: "2px",
  whiteSpace: "nowrap",
};

const dashedRule = {
  border: "none",
  borderTop: "1px dashed var(--ink)",
  opacity: 0.5,
  margin: "10px 0",
};

function DetailCard({ theatre, onClose, lastUpdated }) {
  const isPlaying = Boolean(theatre.showName);
  const headline = theatre.showName || theatre.name;
  const subline = isPlaying ? theatre.name : null;
  const location = locationLine(theatre);

  const updatedLabel = lastUpdated
    ? new Date(lastUpdated)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase()
    : "—";

  return (
    <div
      style={{
        display: "flex",
        boxSizing: "border-box",
        width: "100%",
        background: "var(--cream)",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        boxShadow: "0 10px 24px rgba(0, 0, 0, 0.4)",
        position: "relative",
        fontFamily: "var(--font-body)",
        overflow: "hidden",
      }}
    >
      {/* Accent spine along the left edge */}
      <div
        style={{
          width: "8px",
          flexShrink: 0,
          background: "var(--curtain-red)",
        }}
      />

      {/* Main stub that has the actual information on it */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={fieldLabelStyle}>
            STUB
            <span style={fieldValueStyle}>{theatre.id.toUpperCase()}</span>
          </span>
          <span
            style={{
              ...fieldLabelStyle,
              textAlign: "right",
              color: isPlaying ? "var(--curtain-red)" : "var(--brass)",
              fontWeight: 700,
              opacity: 1,
            }}
          >
            {isPlaying ? "NOW PLAYING" : "CHECK LISTINGS"}
          </span>
        </div>

        <hr style={dashedRule} />

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "21px",
              lineHeight: 1.15,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {headline}
          </div>
          {subline && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10.5px",
                letterSpacing: "1px",
                marginTop: "5px",
                textTransform: "uppercase",
              }}
            >
              {subline}
            </div>
          )}
          {location && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                marginTop: subline ? "1px" : "5px",
                opacity: 0.75,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {location}
            </div>
          )}
          {!isPlaying && (
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "12.5px",
                marginTop: "8px",
                opacity: 0.85,
              }}
            >
              No current production listed on this theatre's Wikipedia page.
            </div>
          )}
        </div>

        <hr style={dashedRule} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={fieldLabelStyle}>
            LISTINGS UPDATED
            <span style={fieldValueStyle}>{updatedLabel}</span>
          </span>
          <span style={{ ...fieldLabelStyle, textAlign: "right" }}>
            SOURCE
            <span style={fieldValueStyle}>WIKIPEDIA</span>
          </span>
        </div>
      </div>

      {/* Perforation between the main stub and the torn-off ticket edge */}
      <div
        style={{
          borderLeft: "2px dashed var(--ink)",
          opacity: 0.5,
        }}
      />

      {/* Torn-off edge */}
      <div
        style={{
          width: "84px",
          flexShrink: 0,
          background: "var(--curtain-red)",
          padding: "6px",
          minHeight: "240px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "100%",
            border: "1px solid var(--cream)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: "10px 0",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "8px",
              letterSpacing: "1.5px",
              color: "var(--cream)",
              opacity: 0.85,
            }}
          >
            ADMIT ONE
          </span>

          {/* Fixed-size box */}
          <div
            style={{
              width: "20px",
              height: "130px",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-90deg)",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                letterSpacing: "3px",
                color: "var(--cream)",
              }}
            >
              WEST END
            </span>
          </div>

          <DecorativeBarcode seed={theatre.id} width={48} height={34} />
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "var(--cream)",
          border: "1.5px solid var(--ink)",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: "12px",
          lineHeight: 1,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

export default DetailCard;
