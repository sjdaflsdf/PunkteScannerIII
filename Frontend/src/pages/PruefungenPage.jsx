export default function PruefungenPage({ onNeuePruefung }) {
  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "600" }}>Prüfungen</h1>
        <button
          onClick={onNeuePruefung}
          style={{
            backgroundColor: "#2d5a4b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          + Neue Prüfung
        </button>
      </div>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", color: "#999", fontSize: "0.875rem" }}>
        Alle Prüfungen werden hier aufgelistet.
      </div>
    </div>
  );
}
