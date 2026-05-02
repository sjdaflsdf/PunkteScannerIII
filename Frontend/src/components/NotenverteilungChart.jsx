import { useState, useEffect } from "react";
import { api } from "../api";

const NOTEN_FARBEN = {
  "1": "#4CAF50",
  "2": "#8BC34A",
  "3": "#FF9800",
  "4": "#F44336",
  "5": "#B71C1C",
};

function notenGruppe(note) {
  if (!note) return "5";
  const n = parseFloat(String(note).replace(",", "."));
  if (n < 2) return "1";
  if (n < 3) return "2";
  if (n < 4) return "3";
  if (n < 5) return "4";
  return "5";
}

export default function NotenverteilungChart({ pruefungId }) {
  const [ergebnisse, setErgebnisse] = useState([]);
  const [pruefungName, setPruefungName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    if (!pruefungId) return;
    setLoading(true);
    setFehler(null);

    api.getPruefungErgebnisse(pruefungId)
      .then((daten) => {
        const arr = Array.isArray(daten) ? daten : (daten?.ergebnisse ?? []);
        setErgebnisse(arr);
        const name = daten?.pruefungName ?? arr[0]?.pruefung?.name ?? "";
        setPruefungName(name);
      })
      .catch((e) => setFehler(e.message))
      .finally(() => setLoading(false));
  }, [pruefungId]);

  // Notenverteilung aus rohen Ergebnissen berechnen
  const gruppen = ["1", "2", "3", "4", "5"].map((g) => ({
    label: g === "5" ? "5,0" : `${g},x`,
    count: ergebnisse.filter((e) => notenGruppe(e.note) === g).length,
    color: NOTEN_FARBEN[g],
  }));

  const gesamt = ergebnisse.length;
  const bestanden = ergebnisse.filter((e) => {
    const n = parseFloat((e.note ?? "5").replace(",", "."));
    return n <= 4.0;
  }).length;
  const bestehensQuote = gesamt > 0 ? Math.round((bestanden / gesamt) * 100) : 0;
  const schnittRoh = gesamt > 0
    ? ergebnisse.reduce((s, e) => s + parseFloat((e.note ?? "5").replace(",", ".")), 0) / gesamt
    : null;
  const schnitt = schnittRoh !== null ? schnittRoh.toFixed(1).replace(".", ",") : "–";
  const maxCount = Math.max(...gruppen.map((g) => g.count), 1);

  const titel = `Notenverteilung${pruefungName ? ` – ${pruefungName}` : ""}`;

  if (!pruefungId) {
    return (
      <div>
        <h3 style={titelStyle}>{titel}</h3>
        <p style={hinweisStyle}>Keine Prüfung ausgewählt.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h3 style={titelStyle}>{titel}</h3>
        <p style={hinweisStyle}>Lade Notenverteilung…</p>
      </div>
    );
  }

  if (fehler) {
    return (
      <div>
        <h3 style={titelStyle}>{titel}</h3>
        <div style={fehlerBoxStyle}><strong>Fehler:</strong> {fehler}</div>
      </div>
    );
  }

  if (gesamt === 0) {
    return (
      <div>
        <h3 style={titelStyle}>{titel}</h3>
        <p style={hinweisStyle}>Keine Ergebnisse vorhanden.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={titelStyle}>{titel}</h3>
      <p style={{ color: "#888", fontSize: "0.78rem", marginBottom: "20px" }}>
        {gesamt} Studierende · Ø Note {schnitt} · {bestehensQuote}% bestanden
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {gruppen.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "26px", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: "4px", height: "13px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: item.color,
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span style={{ width: "18px", textAlign: "right", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const titelStyle = { fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" };
const hinweisStyle = { color: "#bbb", fontSize: "0.82rem", marginTop: "16px" };
const fehlerBoxStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#c00",
  fontSize: "0.82rem",
  marginTop: "12px",
};
