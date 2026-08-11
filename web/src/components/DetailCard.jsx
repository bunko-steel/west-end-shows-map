function DetailCard({ theatre, onClose }) {
  return (
    <div
      style={{
        height: "100%",
        boxSizing: "border-box",
        background: "var(--ink)",
        borderLeft: "1.5px solid var(--brass)",
        padding: "24px 20px",
        position: "relative",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        →
      </button>
      <h3
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-display)",
          fontSize: "24px",
          color: "var(--cream)",
        }}
      >
        {theatre.name}
      </h3>
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
      <p
        style={{
          margin: "8px 0 0",
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
