import StatCard from "../components/StatCard";
import NotenverteilungChart from "../components/NotenverteilungChart";
import NotenschluesselEditor from "../components/NotenschluesselEditor";
import ErgebnisseTabelle from "../components/ErgebnisseTabelle";
import { useBreakpoint } from "../hooks/useBreakpoint";

const PRUEFUNGEN = [
  {
    id: 1,
    name: "Softwareentwicklung I",
    datum: "13. März 2026",
    studierende: 34,
    maxPunkte: 100,
    status: "abgeschlossen",
  },
  {
    id: 2,
    name: "Datenbanken II",
    datum: "22. März 2026",
    studierende: 28,
    maxPunkte: 80,
    status: "in_bearbeitung",
  },
  {
    id: 3,
    name: "Algorithmen & Datenstrukturen",
    datum: "02. April 2026",
    studierende: 41,
    maxPunkte: 120,
    status: "entwurf",
  },
];

function getStatusBadge(status) {
  if (status === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (status === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

function PruefungItem({ pruefung, isMobile }) {
  const badge = getStatusBadge(pruefung.status);
  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      padding: "13px 0",
      borderBottom: "1px solid #f2f2f2",
      gap: isMobile ? "10px" : 0,
    }}>
      <div>
        <p style={{ fontWeight: "500", fontSize: "0.9rem", marginBottom: "3px" }}>{pruefung.name}</p>
        <p style={{ color: "#999", fontSize: "0.78rem" }}>
          {pruefung.datum} · {pruefung.studierende} Studierende · {pruefung.maxPunkte} Pkt. max
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
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
        <button style={{
          border: "1px solid #d8d8d8",
          background: "white",
          padding: "5px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.82rem",
          color: "#444",
        }}>
          Öffnen
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage({ onNeuePruefung }) {
  const { isMobile, isTablet } = useBreakpoint();
  const padding = isMobile ? "20px 16px" : "32px 36px";

  return (
    <div style={{ padding, maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "flex-start",
        gap: isMobile ? "12px" : 0,
        marginBottom: "28px",
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600", marginBottom: "5px" }}>
            Willkommen zurück
          </h1>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>
            Sommersemester 2026 · THWS Würzburg-Schweinfurt
          </p>
        </div>
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
            alignSelf: isMobile ? "flex-start" : "auto",
          }}
        >
          + Neue Prüfung
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px",
      }}>
        <StatCard title="Prüfungen gesamt"     value="12"   sub="3 noch offen"           color="#4a6fa5" />
        <StatCard title="Studierende bewertet" value="187"  sub="von 215 eingetragen"    color="#2d5a4b" />
        <StatCard title="Ø Bestehensquote"     value="78%"  sub="letzte 30 Tage"         color="#8b6914" />
      </div>

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
        {PRUEFUNGEN.map((p) => (
          <PruefungItem key={p.id} pruefung={p} isMobile={isMobile} />
        ))}
      </div>

      {/* Chart + Notenschlüssel */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "16px",
        marginBottom: "16px",
      }}>
        <div style={card}>
          <NotenverteilungChart />
        </div>
        <div style={card}>
          <NotenschluesselEditor />
        </div>
      </div>

      {/* Ergebnisse */}
      <div style={card}>
        <ErgebnisseTabelle />
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
