import { useState, useEffect } from "react";
import { API } from "../api";

const NOTEN_FARBEN = {
  "1": "#4CAF50",
  "2": "#8BC34A",
  "3": "#FF9800",
  "4": "#F44336",
  "5": "#B71C1C",
};

function notenGruppe(note) {
  if (!note) return "5";
  const n = parseFloat(note.replace(",", "."));
  if (n < 2) return "1";
  if (n < 3) return "2";
  if (n < 4) return "3";
  if (n < 5) return "4";
  return "5";
}

export default function NotenverteilungChart({ pruefungId }) {
  const [ergebnisse, setErgebnisse] = useState([]);
  const [laden, setLaden] = useState(false);
  const [pruefungName, setPruefungName] = useState("–");

  useEffect(() => {
    if (!pruefungId) return;
    setLaden(true);
    fetch(`${API}/api/pruefungen/${pruefungId}/ergebnisse`)
      .then((r) => r.json())
      .then((daten) => {
        setErgebnisse(daten);
        if (daten[0]?.pruefung?.name) setPruefungName(daten[0].pruefung.name);
        setLaden(false);
      })
      .catch(() => setLaden(false));
  }, [pruefungId]);

  // Noten gruppieren
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
  const maxCount = Math.max(...gruppen.map((g) => g.count), 1);

  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
        Notenverteilung {pruefungName !== "–" ? `– ${pruefungName}` : ""}
      </h3>
      <p style={{ color: "#888", fontSize: "0.78rem", marginBottom: "20px" }}>
        {gesamt} Studierende · {bestehensQuote}% bestanden
      </p>

      {laden ? (
        <p style={{ color: "#aaa", fontSize: "0.875rem" }}>Lädt...</p>
      ) : gesamt === 0 ? (
        <p style={{ color: "#aaa", fontSize: "0.875rem" }}>Noch keine Ergebnisse.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {gruppen.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "26px", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
                {item.label}
              </span>
              <div style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: "4px", height: "13px", overflow: "hidden" }}>
                <div style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: item.color,
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.4s ease",
                }} />
              </div>
              <span style={{ width: "18px", textAlign: "right", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
