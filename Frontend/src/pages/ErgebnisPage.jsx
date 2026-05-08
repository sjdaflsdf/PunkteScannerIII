import ErgebnisAnzeige from "../components/ErgebnisAnzeige";

export default function ErgebnisPage({ ergebnis, onZurueck }) {
  if (!ergebnis) {
    return (
      <div style={{ padding: "32px 36px" }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "48px 24px",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>📋</p>
          <p style={{ fontWeight: "500", color: "#555", marginBottom: "4px" }}>Kein Ergebnis vorhanden</p>
          <p style={{ fontSize: "0.85rem", color: "#999" }}>Lade eine Prüfung hoch, um die Auswertung zu starten.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "600" }}>
          Auswertung – {ergebnis.pruefungName ?? "Prüfung"}
        </h1>
        <button
          onClick={onZurueck}
          style={{
            border: "1px solid #d8d8d8",
            background: "white",
            padding: "8px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "#444",
          }}
        >
          ← Zurück
        </button>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <ErgebnisAnzeige aufgaben={ergebnis.aufgaben ?? []} note={ergebnis.note} />
      </div>
    </div>
  );
}
