import { useState, useEffect } from "react";
import { api } from "../api";

const DEFAULT_NOTENSCHLUESSEL_ANZEIGE = [
  { note: "1,0", schwelle: 95, color: "#4CAF50" },
  { note: "1,3", schwelle: 90, color: "#4CAF50" },
  { note: "1,7", schwelle: 85, color: "#66BB6A" },
  { note: "2,0", schwelle: 80, color: "#8BC34A" },
  { note: "2,3", schwelle: 75, color: "#8BC34A" },
  { note: "2,7", schwelle: 70, color: "#AED581" },
  { note: "3,0", schwelle: 65, color: "#FF9800" },
  { note: "3,3", schwelle: 60, color: "#FF9800" },
  { note: "3,7", schwelle: 55, color: "#FFA726" },
  { note: "4,0", schwelle: 50, color: "#F44336" },
  { note: "5,0", schwelle: 0,  color: "#B71C1C" },
];

function noteStyle(note) {
  const n = parseFloat((note ?? "5").replace(",", "."));
  if (n <= 1.5) return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
  if (n <= 2.5) return { backgroundColor: "#f1f8e9", color: "#558b2f" };
  if (n <= 3.5) return { backgroundColor: "#fff8e1", color: "#e65100" };
  if (n <= 4.0) return { backgroundColor: "#fce4ec", color: "#c62828" };
  return { backgroundColor: "#ffebee", color: "#b71c1c" };
}

function getStatusBadge(status) {
  const s = (status ?? "").toLowerCase();
  if (s === "abgeschlossen") return { label: "✓ Abgeschlossen", bg: "#e8f5e9", color: "#2e7d32" };
  if (s === "in_bearbeitung") return { label: "● In Bearbeitung", bg: "#e8f5f0", color: "#2d5a4b" };
  return { label: "Entwurf", bg: "#f5f5f5", color: "#757575" };
}

export default function PruefungDetail({ pruefung, onZurueck }) {
  const [aufgaben, setAufgaben] = useState([]);
  const [ergebnisse, setErgebnisse] = useState([]);
  const [ladenAufgaben, setLadenAufgaben] = useState(true);
  const [ladenErgebnisse, setLadenErgebnisse] = useState(true);
  const [fehlerAufgaben, setFehlerAufgaben] = useState(null);
  const [fehlerErgebnisse, setFehlerErgebnisse] = useState(null);
  const [editSchluessel, setEditSchluessel] = useState(null);
  const [schluesselGeaendert, setSchluesselGeaendert] = useState(false);

  useEffect(() => {
    api.getAufgaben(pruefung.id)
      .then(setAufgaben)
      .catch((e) => setFehlerAufgaben(e.message))
      .finally(() => setLadenAufgaben(false));

    api.getPruefungErgebnisse(pruefung.id)
      .then(setErgebnisse)
      .catch((e) => setFehlerErgebnisse(e.message))
      .finally(() => setLadenErgebnisse(false));

    api.getPruefungNotenschluessel(pruefung.id)
      .then((data) => { if (data?.stufen) setEditSchluessel(data.stufen); })
      .catch(() => {});
  }, [pruefung.id]);

  const maxPunkte = pruefung.maxPunkte ?? 0;
  const aktiverSchluessel = editSchluessel ?? DEFAULT_NOTENSCHLUESSEL_ANZEIGE;

  function schwelleAendern(i, neueSchwelle) {
    const basis = editSchluessel ?? DEFAULT_NOTENSCHLUESSEL_ANZEIGE.map(n => ({ ...n }));
    setEditSchluessel(basis.map((n, j) => j === i ? { ...n, schwelle: Number(neueSchwelle) } : n));
    setSchluesselGeaendert(true);
  }

  function punkteAendern(i, neuePkte) {
    const neueSchwelle = maxPunkte > 0
      ? Math.min(100, Math.max(0, Math.round(Number(neuePkte) / maxPunkte * 100)))
      : 0;
    const basis = editSchluessel ?? DEFAULT_NOTENSCHLUESSEL_ANZEIGE.map(n => ({ ...n }));
    setEditSchluessel(basis.map((n, j) => j === i ? { ...n, schwelle: neueSchwelle } : n));
    setSchluesselGeaendert(true);
  }

  function schluesselSpeichern() {
    api.savePruefungNotenschluessel(pruefung.id, aktiverSchluessel)
      .then(() => setSchluesselGeaendert(false))
      .catch(() => alert("Fehler beim Speichern des Notenschlüssels."));
  }

  const badge = getStatusBadge(pruefung.status);
  const datum = pruefung.datum
    ? new Date(pruefung.datum).toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Kein Datum";

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "24px",
      }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "4px" }}>
            {pruefung.name ?? "Prüfung"}
          </h1>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>
            {datum}
            {pruefung.maxPunkte ? ` · ${pruefung.maxPunkte} Pkt. max` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
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
            onClick={onZurueck}
            style={{
              border: "1px solid #d8d8d8",
              background: "white",
              padding: "8px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#444",
              whiteSpace: "nowrap",
            }}
          >
            ← Zurück
          </button>
        </div>
      </div>

      {/* Aufgaben */}
      <div style={card}>
        <h2 style={sectionTitle}>Aufgaben</h2>
        {ladenAufgaben ? (
          <p style={hinweisStyle}>Lädt…</p>
        ) : fehlerAufgaben ? (
          <p style={{ color: "#b71c1c", fontSize: "0.875rem" }}>{fehlerAufgaben}</p>
        ) : aufgaben.length === 0 ? (
          <p style={hinweisStyle}>Keine Aufgaben für diese Prüfung angelegt.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>Aufgabe</th>
                <th style={TH}>Max. Punkte</th>
              </tr>
            </thead>
            <tbody>
              {aufgaben.map((a) => (
                <tr
                  key={a.id}
                  onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = "#fafafa")}
                  onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = "")}
                >
                  <td style={TD}>Aufgabe {a.aufgabeNr}</td>
                  <td style={TD}>{a.maxPunkte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notenschlüssel */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Notenschlüssel</h2>
          {schluesselGeaendert && (
            <button onClick={schluesselSpeichern} style={primaerBtnStyle}>Speichern</button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {aktiverSchluessel.map((eintrag, i) => {
            const pkt = eintrag.schwelle > 0 ? Math.ceil(eintrag.schwelle / 100 * maxPunkte) : null;
            const prevPkt = i > 0 ? Math.ceil(aktiverSchluessel[i - 1].schwelle / 100 * maxPunkte) : null;
            return (
              <div key={eintrag.note} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ backgroundColor: eintrag.color, color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "0.78rem", fontWeight: "700", minWidth: "34px", textAlign: "center", flexShrink: 0 }}>
                  {eintrag.note}
                </span>
                {eintrag.note === "5,0" ? (
                  <>
                    <span style={{ fontSize: "0.82rem", color: "#888" }}>unter {aktiverSchluessel[i - 1]?.schwelle ?? 50}%</span>
                    <span style={{ fontSize: "0.78rem", color: "#bbb" }}>= &lt; {prevPkt} Pkt.</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>ab</span>
                    <input
                      type="number" min="1" max="100"
                      value={eintrag.schwelle}
                      onChange={(e) => schwelleAendern(i, e.target.value)}
                      style={numInput}
                    />
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>%</span>
                    <span style={{ fontSize: "0.82rem", color: "#bbb", margin: "0 4px" }}>=</span>
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>≥</span>
                    <input
                      type="number" min="0" max={maxPunkte}
                      value={pkt ?? 0}
                      onChange={(e) => punkteAendern(i, e.target.value)}
                      style={numInput}
                    />
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>Pkt.</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ergebnisse */}
      <div style={card}>
        <h2 style={sectionTitle}>Ergebnisse</h2>
        {ladenErgebnisse ? (
          <p style={hinweisStyle}>Lädt…</p>
        ) : fehlerErgebnisse ? (
          <p style={{ color: "#b71c1c", fontSize: "0.875rem" }}>{fehlerErgebnisse}</p>
        ) : ergebnisse.length === 0 ? (
          <p style={hinweisStyle}>
            Noch keine Ergebnisse vorhanden. Führe zunächst eine Auswertung durch.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>Matrikel-Nr.</th>
                <th style={TH}>Gesamtpunkte</th>
                <th style={TH}>Note</th>
              </tr>
            </thead>
            <tbody>
              {ergebnisse.map((e) => {
                const ns = noteStyle(e.note);
                return (
                  <tr
                    key={e.id}
                    onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = "#fafafa")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = "")}
                  >
                    <td style={{ ...TD, color: "#888" }}>{e.student?.matNr ?? "–"}</td>
                    <td style={TD}>{e.gesamtPunkte ?? "–"}</td>
                    <td style={TD}>
                      <span style={{
                        ...ns,
                        padding: "3px 10px",
                        borderRadius: "5px",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                      }}>
                        {e.note ?? "–"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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

const sectionTitle = {
  fontSize: "0.72rem",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#999",
  marginBottom: "16px",
};

const TH = {
  padding: "10px 14px",
  borderBottom: "2px solid #e8e8e8",
  color: "#666",
  fontWeight: "600",
  fontSize: "0.8rem",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const TD = {
  padding: "10px 14px",
  borderBottom: "1px solid #f2f2f2",
  fontSize: "0.875rem",
  color: "#333",
};

const hinweisStyle = {
  color: "#aaa",
  fontSize: "0.875rem",
  padding: "8px 0",
};

const numInput = {
  border: "1px solid #e0e0e0",
  borderRadius: "5px",
  padding: "5px 8px",
  fontSize: "0.875rem",
  textAlign: "center",
  width: "62px",
  outline: "none",
  boxSizing: "border-box",
};

const primaerBtnStyle = {
  backgroundColor: "#2d5a4b",
  color: "white",
  border: "none",
  padding: "6px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.82rem",
};
