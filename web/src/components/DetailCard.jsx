function DetailCard({ theatre, onClose }) {
  return (
    <div
      style={{
        height: "100%",
        boxSizing: "border-box",
        background: "var(--cream)",
        borderLeft: "1.5px solid var(--gold)",
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
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        →
      </button>
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          fontSize: "12px",
          letterSpacing: "2px",
          color: "var(--curtain-red)",
        }}
      >
        {theatre.showName ? "NOW PLAYING" : "CHECK LISTINGS"}
      </p>
      <h3
        style={{
          margin: "8px 0",
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          color: "var(--ink)",
        }}
      >
        {theatre.name}
      </h3>
      <p
        style={{
          margin: 0,
          fontStyle: "italic",
          fontSize: "15px",
          color: "var(--ink)",
        }}
      >
        {theatre.showName ||
          "No current production listed on this theatre's Wikipedia page."}
      </p>
    </div>
  );
}

export default DetailCard;
