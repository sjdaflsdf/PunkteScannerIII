import { useState } from "react";

const INITIAL_SCHLUESSEL = [
  { note: "1,0", schwelle: "90", color: "#4CAF50" },
  { note: "2,0", schwelle: "75", color: "#8BC34A" },
  { note: "3,0", schwelle: "60", color: "#FF9800" },
  { note: "4,0", schwelle: "50", color: "#F44336" },
  { note: "5,0", schwelle: null,  color: "#B71C1C" },
];

export default function NotenschluesselEditor({ pruefungName = "Datenbanken II" }) {
  const [schluessel, setSchluessel] = useState(INITIAL_SCHLUESSEL);
  const [gespeichert, setGespeichert] = useState(false);

  function handleChange(index, value) {
    setSchluessel((prev) =>
      prev.map((n, i) => (i === index ? { ...n, schwelle: value } : n))
    );
    setGespeichert(false);
  }

  function handleSpeichern() {
    // Hier später: ans Backend senden
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
        Notenschlüssel – {pruefungName}
      </h3>
      <p style={{ color: "#888", fontSize: "0.78rem", marginBottom: "20px" }}>
        Ab welchem Prozentsatz gilt welche Note?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {schluessel.map((item, i) => (
          <div key={item.note} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              backgroundColor: item.color,
              color: "white",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: "600",
              width: "42px",
              textAlign: "center",
              flexShrink: 0,
            }}>
              {item.note}
            </span>

            <div style={{
              flex: 1,
              border: "1px solid #e8e8e8",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "0.82rem",
              color: "#555",
              backgroundColor: "#fafafa",
            }}>
              {item.schwelle !== null ? (
                <span>
                  ab{" "}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.schwelle}
                    onChange={(e) => handleChange(i, e.target.value)}
                    style={{
                      width: "44px",
                      border: "none",
                      background: "transparent",
                      fontWeight: "600",
                      fontSize: "0.82rem",
                      padding: "0",
                      color: "#333",
                      outline: "none",
                    }}
                  />
                  %
                </span>
              ) : (
                <span style={{ color: "#888" }}>unter 50 %</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSpeichern}
        style={{
          marginTop: "20px",
          width: "100%",
          backgroundColor: gespeichert ? "#4CAF50" : "#2d5a4b",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: "500",
          transition: "background 0.2s",
        }}
      >
        {gespeichert ? "✓ Gespeichert" : "Speichern"}
      </button>
    </div>
  );
}
