import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import NotenverteilungChart from "../components/NotenverteilungChart";
import NotenschluesselEditor from "../components/NotenschluesselEditor";
import ErgebnisseTabelle from "../components/ErgebnisseTabelle";
import { API } from "../api";
import { useBreakpoint } from "../hooks/useBreakpoint";

function getStatusBadge(status) {
  const s = (status ?? "").toLowerCase();
  if (s === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (s === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

function PruefungItem({ pruefung, onPruefungOeffnen, onLoeschen, isMobile }) {
  const badge = getStatusBadge(pruefung.status);
  const datum = pruefung.datum
    ? new Date(pruefung.datum).toLocaleDateString("de-DE", { day: "numeric", month: isMobile ? "short" : "long", year: "numeric" })
    : "Kein Datum";

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "13px 0",
      borderBottom: "1px solid #f2f2f2",
      gap: "8px",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontWeight: "500", fontSize: "0.9rem", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pruefung.name ?? "Unbenannte Prüfung"}
        </p>
        <p style={{ color: "#999", fontSize: "0.78rem" }}>
          {datum}{pruefung.maxPunkte != null ? ` · ${pruefung.maxPunkte} Pkt.` : ""}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {pruefung.lokal && !isMobile && (
          <span style={{ backgroundColor: "#fff8e1", color: "#a16800", padding: "4px 10px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "500", whiteSpace: "nowrap", border: "1px solid #ffe082" }}>
            Lokal
          </span>
        )}
        {!isMobile && (
          <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "500", whiteSpace: "nowrap" }}>
            {badge.label}
          </span>
        )}
        <button
          onClick={() => onPruefungOeffnen?.(pruefung)}
          style={{ border: "1px solid #d8d8d8", background: "white", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#444", whiteSpace: "nowrap" }}
        >
          Öffnen
        </button>
        {pruefung.lokal && (
          <button
            onClick={() => { if (window.confirm(`"${pruefung.name}" wirklich löschen?`)) onLoeschen(pruefung.id); }}
            style={{ border: "1px solid #fcc", background: "white", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#e57373" }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default function OverviewPage({ onNeuePruefung, onNeuePruefungLokal, onAuswerten, onPruefungOeffnen }) {
  const { isMobile } = useBreakpoint();
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

  const p = isMobile ? "16px" : "32px 36px";

  return (
    <div style={{ padding: p, maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? "16px" : "28px" }}>
        <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600", marginBottom: "4px" }}>
          Willkommen zurück
        </h1>
        <p style={{ color: "#999", fontSize: "0.85rem", marginBottom: isMobile ? "14px" : "0" }}>
          Sommersemester 2026 · THWS Würzburg-Schweinfurt
        </p>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "8px", marginTop: isMobile ? "12px" : "16px" }}>
          <button onClick={onNeuePruefung} style={isMobile ? btnFullPrimary : btnPrimary}>
            + Prüfung anlegen
          </button>
          <button onClick={onNeuePruefungLokal} style={isMobile ? btnFullSecondary : btnSecondary}>
            + Lokal anlegen
          </button>
          <button onClick={onAuswerten} style={isMobile ? btnFullSecondary : btnSecondary}>
            Klausur auswerten
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: isMobile ? "10px" : "16px",
        marginBottom: isMobile ? "16px" : "24px",
      }}>
        <StatCard title="Prüfungen gesamt"     value={anzahlPruefungen} sub={`${offene} noch offen`} color="#4a6fa5" />
        <StatCard title="Studierende bewertet" value="–"                sub="wird geladen"           color="#2d5a4b" />
        {!isMobile && <StatCard title="Ø Bestehensquote" value="–" sub="wird geladen" color="#8b6914" />}
      </div>

      {/* Fehler */}
      {fehler && (
        <div style={{ backgroundColor: "#ffebee", color: "#b71c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.875rem" }}>
          {fehler}
        </div>
      )}

      {/* Aktuelle Prüfungen */}
      <div style={card}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#999", marginBottom: "4px" }}>
          Aktuelle Prüfungen
        </h2>
        {laden ? (
          <p style={{ color: "#aaa", fontSize: "0.875rem", padding: "16px 0" }}>Lädt...</p>
        ) : allePruefungen.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "0.875rem", padding: "16px 0" }}>Keine Prüfungen gefunden.</p>
        ) : (
          allePruefungen.map((p) => (
            <PruefungItem key={p.id} pruefung={p} onPruefungOeffnen={onPruefungOeffnen} onLoeschen={lokalePruefungLoeschen} isMobile={isMobile} />
          ))
        )}
      </div>

      {/* Chart + Notenschlüssel — nur Desktop */}
      {!isMobile && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={card}><NotenverteilungChart pruefungId={pruefungen[0]?.id} /></div>
          <div style={card}><NotenschluesselEditor /></div>
        </div>
      )}

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

const btnPrimary = { backgroundColor: "#2d5a4b", color: "white", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", whiteSpace: "nowrap" };
const btnSecondary = { backgroundColor: "white", color: "#2d5a4b", border: "1.5px solid #2d5a4b", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", whiteSpace: "nowrap" };
const btnFullPrimary = { ...btnPrimary, width: "100%", textAlign: "center", padding: "12px" };
const btnFullSecondary = { ...btnSecondary, width: "100%", textAlign: "center", padding: "12px" };
