function DetailCard({ theatre, onClose }) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        background: "var(--ink)",
        border: "1.5px solid var(--brass)",
        borderRadius: "6px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        padding: "24px 20px",
        position: "relative",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "12px",
          right: "14px",
          background: "none",
          border: "none",
          color: "var(--cream)",
          cursor: "pointer",
          fontSize: "20px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          fontSize: "12px",
          letterSpacing: "2px",
          color: "var(--brass)",
        }}
      >
        {theatre.showName ? "NOW PLAYING" : "CHECK LISTINGS"}
      </p>
      <h3
        style={{
          margin: "8px 0",
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          color: "var(--cream)",
        }}
      >
        {theatre.name}
      </h3>
      <p
        style={{
          margin: 0,
          fontStyle: "italic",
          fontSize: "15px",
          color: "var(--cream)",
        }}
      >
        {theatre.showName ||
          "No current production listed on this theatre's Wikipedia page."}
      </p>
    </div>
  );
}

export default DetailCard;
