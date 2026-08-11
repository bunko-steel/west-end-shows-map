function DetailCard({ theatre, onClose }) {
  return (
    <div
      style={{
        marginTop: "16px",
        background: "var(--cream)",
        border: "1.5px solid var(--gold)",
        padding: "16px 20px",
        position: "relative",
        fontFamily: "var(--font-body)",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          background: "none",
          border: "none",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ✕
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
          margin: "4px 0",
          fontFamily: "var(--font-display)",
          fontSize: "20px",
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
