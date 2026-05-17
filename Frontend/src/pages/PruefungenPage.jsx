import { useState, useEffect } from "react";
import { api } from "../api";
import { useBreakpoint } from "../hooks/useBreakpoint";

function getStatusBadge(status) {
  if (status === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (status === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

export default function PruefungenPage({ onNeuePruefung, onNeuePruefungLokal, onAuswerten, onPruefungOeffnen }) {
  const { isMobile } = useBreakpoint();
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
    <div style={{ padding: isMobile ? "16px" : "32px 36px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600", marginBottom: isMobile ? "12px" : "0" }}>
          Prüfungen
        </h1>
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            <button onClick={onNeuePruefung} style={btnFullPrimary}>+ Prüfung anlegen</button>
            <button onClick={onNeuePruefungLokal} style={btnFullSecondary}>+ Lokal anlegen</button>
            <button onClick={onAuswerten} style={btnFullSecondary}>Klausur auswerten</button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onNeuePruefung} style={btnPrimary}>+ Prüfung anlegen</button>
              <button onClick={onNeuePruefungLokal} style={btnSecondary}>+ Lokal anlegen</button>
              <button onClick={onAuswerten} style={btnSecondary}>Klausur auswerten</button>
            </div>
          </div>
        )}
      </div>

      {/* Liste */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: isMobile ? "4px 16px" : "8px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        {loading && <p style={{ color: "#999", fontSize: "0.875rem", padding: "16px 0" }}>Lade Prüfungen…</p>}
        {fehler && <div style={fehlerBoxStyle}><strong>Fehler:</strong> {fehler}</div>}
        {!loading && !fehler && allePruefungen.length === 0 && (
          <p style={{ color: "#999", fontSize: "0.875rem", padding: "16px 0" }}>
            Noch keine Prüfungen vorhanden. Lege eine neue an.
          </p>
        )}
        {!loading && !fehler && allePruefungen.map((p) => {
          const badge = getStatusBadge(p.status);
          return (
            <div key={p.id} style={{ padding: "14px 0", borderBottom: "1px solid #f2f2f2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "3px" }}>
                    <p style={{ fontWeight: "500", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                    {p.lokal && (
                      <span style={{ backgroundColor: "#fff8e1", color: "#a16800", padding: "2px 7px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "600", border: "1px solid #ffe082", flexShrink: 0 }}>
                        Lokal
                      </span>
                    )}
                  </div>
                  <p style={{ color: "#999", fontSize: "0.78rem" }}>
                    {p.datum}{p.maxPunkte != null ? ` · ${p.maxPunkte} Pkt.` : ""}
                  </p>
                  {!isMobile && (
                    <span style={{ display: "inline-block", marginTop: "4px", backgroundColor: badge.bg, color: badge.color, padding: "2px 10px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "500" }}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => onPruefungOeffnen(p)} style={{ border: "1px solid #d8d8d8", background: "white", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#444" }}>
                    Öffnen
                  </button>
                  {p.lokal && (
                    <button
                      onClick={() => { if (window.confirm(`"${p.name}" wirklich löschen?`)) lokalePruefungLoeschen(p.id); }}
                      style={{ border: "1px solid #fcc", background: "white", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#e57373" }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnPrimary    = { backgroundColor: "#2d5a4b", color: "white", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" };
const btnSecondary  = { backgroundColor: "white", color: "#2d5a4b", border: "1.5px solid #2d5a4b", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" };
const btnFullPrimary   = { ...btnPrimary,   width: "100%", padding: "12px", textAlign: "center" };
const btnFullSecondary = { ...btnSecondary, width: "100%", padding: "12px", textAlign: "center" };

const fehlerBoxStyle = {
  backgroundColor: "#fff3f3", border: "1px solid #fcc", borderRadius: "8px",
  padding: "12px 16px", color: "#c00", fontSize: "0.82rem", margin: "16px 0",
};
