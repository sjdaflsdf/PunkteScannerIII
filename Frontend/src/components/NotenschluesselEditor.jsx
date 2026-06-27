import { useState, useEffect } from "react";
import { api } from "../api";

export default function NotenschluesselEditor({ pruefungName = null }) {
  const [schluessel, setSchluessel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    api.getNotenschluessel()
      .then((data) => setSchluessel(Array.isArray(data) ? data : []))
      .catch((e) => setFehler(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(index, wert) {
    setSchluessel((prev) =>
      prev.map((n, i) =>
        i === index ? { ...n, schwelle: wert === "" ? null : Number(wert) } : n
      )
    );
    setGespeichert(false);
  }

  function handleSpeichern() {
    // Speichern-Endpunkt noch nicht vorhanden – nur lokal
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  }

  if (loading) {
    return <p style={{ color: "#999", fontSize: "0.875rem" }}>Lade Notenschlüssel…</p>;
  }

  if (fehler) {
    return (
      <div style={fehlerBoxStyle}>
        <strong>Fehler:</strong> {fehler}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
        {pruefungName ? `Notenschlüssel – ${pruefungName}` : "Notenschlüssel"}
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
                <span style={{ color: "#888" }}>
                  unter {schluessel[i - 1]?.schwelle ?? 50} %
                </span>
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

const fehlerBoxStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#c00",
  fontSize: "0.82rem",
};
