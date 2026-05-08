import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import NotenverteilungChart from "../components/NotenverteilungChart";
import NotenschluesselEditor from "../components/NotenschluesselEditor";
import ErgebnisseTabelle from "../components/ErgebnisseTabelle";
import { API } from "../api";

function getStatusBadge(status) {
  const s = (status ?? "").toLowerCase();
  if (s === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (s === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

function PruefungItem({ pruefung, onPruefungOeffnen, onLoeschen }) {
  const badge = getStatusBadge(pruefung.status);
  const datum = pruefung.datum
    ? new Date(pruefung.datum).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : "Kein Datum";

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "13px 0",
      borderBottom: "1px solid #f2f2f2",
    }}>
      <div>
        <p style={{ fontWeight: "500", fontSize: "0.9rem", marginBottom: "3px" }}>
          {pruefung.name ?? "Unbenannte Prüfung"}
        </p>
        <p style={{ color: "#999", fontSize: "0.78rem" }}>
          {datum} · {pruefung.maxPunkte} Pkt. max
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "16px" }}>
        {pruefung.lokal && (
          <span style={{
            backgroundColor: "#fff8e1", color: "#a16800",
            padding: "4px 10px", borderRadius: "20px",
            fontSize: "0.78rem", fontWeight: "500",
            whiteSpace: "nowrap", border: "1px solid #ffe082",
          }}>Lokal</span>
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
          onClick={() => onPruefungOeffnen?.(pruefung)}
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
        {pruefung.lokal && (
          <button
            onClick={() => {
              if (window.confirm(`"${pruefung.name}" wirklich löschen?`)) onLoeschen(pruefung.id);
            }}
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
}

export default function OverviewPage({ onNeuePruefung, onNeuePruefungLokal, onAuswerten, onPruefungOeffnen }) {
  const [pruefungen, setPruefungen] = useState([]);
  const [lokalePruefungen, setLokalePruefungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    setLokalePruefungen(JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]"));
    fetch(`${API}/api/pruefungen`)
      .then((r) => r.json())
      .then((daten) => {
        setPruefungen(daten);
        setLaden(false);
      })
      .catch(() => {
        setFehler("Server nicht erreichbar. Läuft node server.js?");
        setLaden(false);
      });
  }, []);

  function lokalePruefungLoeschen(id) {
    const aktualisiert = lokalePruefungen.filter((p) => p.id !== id);
    localStorage.setItem("pruefungen_lokal", JSON.stringify(aktualisiert));
    setLokalePruefungen(aktualisiert);
  }

  const allePruefungen = [...pruefungen, ...lokalePruefungen];
  const anzahlPruefungen = allePruefungen.length;
  const offene = allePruefungen.filter((p) =>
    (p.status ?? "").toLowerCase() !== "abgeschlossen"
  ).length;

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "5px" }}>Willkommen zurück</h1>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>
            Sommersemester 2026 · THWS Würzburg-Schweinfurt
          </p>
        </div>
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
              whiteSpace: "nowrap",
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
              whiteSpace: "nowrap",
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
              whiteSpace: "nowrap",
            }}
          >
            Klausur auswerten
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Prüfungen gesamt"    value={anzahlPruefungen} sub={`${offene} noch offen`}  color="#4a6fa5" />
        <StatCard title="Studierende bewertet" value="–"  sub="wird geladen"     color="#2d5a4b" />
        <StatCard title="Ø Bestehensquote"    value="–"  sub="wird geladen"     color="#8b6914" />
      </div>

      {/* Fehler */}
      {fehler && (
        <div style={{ backgroundColor: "#ffebee", color: "#b71c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.875rem" }}>
          {fehler}
        </div>
      )}

      {/* Aktuelle Prüfungen */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h2 style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#999" }}>
            Aktuelle Prüfungen
          </h2>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#2d5a4b", fontSize: "0.82rem" }}>
            Alle anzeigen →
          </button>
        </div>

        {laden ? (
          <p style={{ color: "#aaa", fontSize: "0.875rem", padding: "16px 0" }}>Lädt...</p>
        ) : allePruefungen.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "0.875rem", padding: "16px 0" }}>Keine Prüfungen gefunden.</p>
        ) : (
          allePruefungen.map((p) => (
            <PruefungItem key={p.id} pruefung={p} onPruefungOeffnen={onPruefungOeffnen} onLoeschen={lokalePruefungLoeschen} />
          ))
        )}
      </div>

      {/* Chart + Notenschlüssel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={card}>
          <NotenverteilungChart pruefungId={pruefungen[0]?.id} />
        </div>
        <div style={card}>
          <NotenschluesselEditor />
        </div>
      </div>

      {/* Ergebnisse */}
      <div style={card}>
        <ErgebnisseTabelle pruefungId={pruefungen[0]?.id} />
      </div>

    </div>
  );
}

const card = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "22px 24px",
  marginBottom: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
};
