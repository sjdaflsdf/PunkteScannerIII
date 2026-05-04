import { useState, useEffect } from "react";
import { api } from "../api";
import StatCard from "../components/StatCard";
import NotenverteilungChart from "../components/NotenverteilungChart";
import NotenschluesselEditor from "../components/NotenschluesselEditor";
import ErgebnisseTabelle from "../components/ErgebnisseTabelle";

function getStatusBadge(status) {
  if (status === "abgeschlossen")
    return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (status === "in_bearbeitung")
    return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

function PruefungItem({ pruefung, isSelected, onSelect }) {
  const badge = getStatusBadge(pruefung.status);
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "13px 0",
      borderBottom: "1px solid #f2f2f2",
    }}>
      <div>
        <p style={{ fontWeight: "500", fontSize: "0.9rem", marginBottom: "3px" }}>{pruefung.name}</p>
        <p style={{ color: "#999", fontSize: "0.78rem" }}>
          {pruefung.datum}
          {pruefung.studierende != null ? ` · ${pruefung.studierende} Studierende` : ""}
          {pruefung.maxPunkte   != null ? ` · ${pruefung.maxPunkte} Pkt. max` : ""}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "16px" }}>
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
          onClick={() => onSelect(pruefung.id)}
          style={{
            border: isSelected ? "1px solid #2d5a4b" : "1px solid #d8d8d8",
            background: isSelected ? "#f0f7f4" : "white",
            padding: "5px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.82rem",
            color: isSelected ? "#2d5a4b" : "#444",
            fontWeight: isSelected ? "600" : "400",
          }}
        >
          {isSelected ? "Gewählt" : "Öffnen"}
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage({ onNeuePruefung, onAuswerten }) {
  const [pruefungen, setPruefungen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.getPruefungen()
      .then((daten) => {
        setPruefungen(daten);
        if (daten.length > 0) setSelectedId(daten[0].id);
      })
      .catch((e) => setFehler(e.message))
      .finally(() => setLoading(false));
  }, []);

  const gesamt   = pruefungen.length;
  const offen    = pruefungen.filter((p) => p.status !== "abgeschlossen").length;
  const bewertet = pruefungen
    .filter((p) => p.status === "abgeschlossen")
    .reduce((s, p) => s + (p.studierende ?? 0), 0);
  const total    = pruefungen.reduce((s, p) => s + (p.studierende ?? 0), 0);
  const abgeProzent = gesamt > 0 ? Math.round(((gesamt - offen) / gesamt) * 100) : 0;

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
        <StatCard
          title="Prüfungen gesamt"
          value={loading ? "–" : String(gesamt)}
          sub={loading ? "Lade…" : `${offen} noch offen`}
          color="#4a6fa5"
        />
        <StatCard
          title="Studierende bewertet"
          value={loading ? "–" : String(bewertet)}
          sub={loading ? "Lade…" : total > 0 ? `von ${total} eingetragen` : "keine Daten"}
          color="#2d5a4b"
        />
        <StatCard
          title="Abgeschlossen"
          value={loading ? "–" : `${abgeProzent}%`}
          sub="Prüfungen fertig"
          color="#8b6914"
        />
      </div>

      {/* Prüfungsliste */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h2 style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#999" }}>
            Aktuelle Prüfungen
          </h2>
        </div>

        {loading && <p style={hinweisStyle}>Lade Prüfungen…</p>}

        {fehler && (
          <div style={fehlerBoxStyle}><strong>Fehler:</strong> {fehler}</div>
        )}

        {!loading && !fehler && pruefungen.length === 0 && (
          <p style={hinweisStyle}>Keine Prüfungen vorhanden.</p>
        )}

        {!loading && !fehler && pruefungen.map((p) => (
          <PruefungItem
            key={p.id}
            pruefung={p}
            isSelected={p.id === selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      {/* Notenverteilung + Notenschlüssel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={card}>
          <NotenverteilungChart pruefungId={selectedId} />
        </div>
        <div style={card}>
          <NotenschluesselEditor />
        </div>
      </div>

      {/* Ergebnistabelle der gewählten Prüfung */}
      <div style={card}>
        <ErgebnisseTabelle pruefungId={selectedId} />
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

const hinweisStyle = { color: "#999", fontSize: "0.875rem", padding: "12px 0" };

const fehlerBoxStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#c00",
  fontSize: "0.82rem",
  margin: "8px 0",
};
