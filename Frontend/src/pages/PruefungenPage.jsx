import { useState, useEffect } from "react";
import { api } from "../api";

function getStatusBadge(status) {
  if (status === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (status === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

export default function PruefungenPage({ onNeuePruefung, onNeuePruefungLokal, onAuswerten, onPruefungOeffnen }) {
  const [pruefungen, setPruefungen] = useState([]);
  const [lokalePruefungen, setLokalePruefungen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    setLokalePruefungen(JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]"));
    api.getPruefungen()
      .then(setPruefungen)
      .catch((e) => setFehler(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allePruefungen = [...pruefungen, ...lokalePruefungen];

  function lokalePruefungLoeschen(id) {
    const aktualisiert = lokalePruefungen.filter((p) => p.id !== id);
    localStorage.setItem("pruefungen_lokal", JSON.stringify(aktualisiert));
    setLokalePruefungen(aktualisiert);
  }

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "600" }}>Prüfungen</h1>
        <div style={{ display: "flex", gap: "10px" }}>
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
            + Prüfung anlegen
          </button>
          <button
            onClick={onNeuePruefungLokal}
            title="Prüfung nur im Browser anlegen – kein Server nötig"
            style={{
              backgroundColor: "white",
              color: "#2d5a4b",
              border: "1.5px solid #2d5a4b",
              borderRadius: "8px",
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            + Lokal anlegen
          </button>
          <button
            onClick={onAuswerten}
            style={{
              backgroundColor: "white",
              color: "#2d5a4b",
              border: "1.5px solid #2d5a4b",
              borderRadius: "8px",
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Klausur auswerten
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "8px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        {loading && (
          <p style={{ color: "#999", fontSize: "0.875rem", padding: "16px 0" }}>Lade Prüfungen…</p>
        )}
        {fehler && (
          <div style={fehlerBoxStyle}>
            <strong>Fehler:</strong> {fehler}
          </div>
        )}
        {!loading && !fehler && allePruefungen.length === 0 && (
          <p style={{ color: "#999", fontSize: "0.875rem", padding: "16px 0" }}>
            Noch keine Prüfungen vorhanden. Lege eine neue an.
          </p>
        )}
        {!loading && !fehler && allePruefungen.map((p) => {
          const badge = getStatusBadge(p.status);
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #f2f2f2",
              }}
            >
              <div>
                <p style={{ fontWeight: "500", fontSize: "0.9rem", marginBottom: "3px" }}>{p.name}</p>
                <p style={{ color: "#999", fontSize: "0.78rem" }}>
                  {p.datum}
                  {p.studierende != null ? ` · ${p.studierende} Studierende` : ""}
                  {p.maxPunkte   != null ? ` · ${p.maxPunkte} Pkt. max` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {p.lokal && (
                  <span style={{
                    backgroundColor: "#fff8e1",
                    color: "#a16800",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    border: "1px solid #ffe082",
                  }}>
                    Lokal
                  </span>
                )}
                <span style={{
                  backgroundColor: badge.bg,
                  color: badge.color,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                }}>
                  {badge.label}
                </span>
                <button
                  onClick={() => onPruefungOeffnen(p)}
                  style={{
                    border: "1px solid #d8d8d8",
                    background: "white",
                    padding: "5px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "#444",
                  }}
                >
                  Öffnen
                </button>
                {p.lokal && (
                  <button
                    onClick={() => {
                      if (window.confirm(`"${p.name}" wirklich löschen?`)) {
                        lokalePruefungLoeschen(p.id);
                      }
                    }}
                    title="Prüfung löschen"
                    style={{
                      border: "1px solid #fcc",
                      background: "white",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: "#e57373",
                    }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  margin: "16px 0",
};
