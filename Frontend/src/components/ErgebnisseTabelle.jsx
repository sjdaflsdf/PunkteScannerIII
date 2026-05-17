import { useState, useEffect } from "react";
import { API } from "../api";

function noteStyle(noteStr) {
  const n = parseFloat((noteStr ?? "5").replace(",", "."));
  if (n <= 1.5) return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
  if (n <= 2.5) return { backgroundColor: "#f1f8e9", color: "#558b2f" };
  if (n <= 3.5) return { backgroundColor: "#fff8e1", color: "#e65100" };
  if (n <= 4.0) return { backgroundColor: "#fce4ec", color: "#c62828" };
  return { backgroundColor: "#ffebee", color: "#b71c1c" };
}

const TH = { padding: "10px 14px", borderBottom: "2px solid #e8e8e8", color: "#666", fontWeight: "600", fontSize: "0.8rem", textAlign: "left", whiteSpace: "nowrap" };
const TD = { padding: "10px 14px", borderBottom: "1px solid #f2f2f2", fontSize: "0.875rem", color: "#333" };

function downloadDatei(inhalt, dateiname, typ) {
  const blob = new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ErgebnisseTabelle({ pruefungId }) {
  const [ergebnisse, setErgebnisse] = useState([]);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    if (!pruefungId) return;
    setLaden(true);
    fetch(`${API}/api/pruefungen/${pruefungId}/ergebnisse`)
      .then((r) => r.json())
      .then((daten) => {
        setErgebnisse(daten);
        setLaden(false);
      })
      .catch(() => {
        setFehler("Ergebnisse konnten nicht geladen werden.");
        setLaden(false);
      });
  }, [pruefungId]);

  function exportCSV() {
    const header = ["Matrikel-Nr.", "Note", "Gesamtpunkte"];
    const rows = ergebnisse.map((e) => [
      e.student?.matNr ?? "–",
      e.note ?? "–",
      e.gesamtPunkte ?? 0,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    downloadDatei(csv, "ergebnisse.csv", "text/csv");
  }

  function exportJSON() {
    downloadDatei(JSON.stringify(ergebnisse, null, 2), "ergebnisse.json", "application/json");
  }

  const pruefungName = ergebnisse[0]?.pruefung?.name ?? "–";

  return (
    <div>
      <h3 style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: "16px" }}>
        Ergebnisse {pruefungName !== "–" ? `– ${pruefungName}` : ""}
      </h3>

      {fehler && (
        <p style={{ color: "#b71c1c", fontSize: "0.875rem" }}>{fehler}</p>
      )}

      {laden ? (
        <p style={{ color: "#aaa", fontSize: "0.875rem" }}>Lädt...</p>
      ) : ergebnisse.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "0.875rem" }}>
          {pruefungId ? "Keine Ergebnisse für diese Prüfung." : "Keine Prüfung ausgewählt."}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
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
                    onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = "#fafafa"}
                    onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = ""}
                  >
                    <td style={{ ...TD, color: "#888" }}>{e.student?.matNr ?? "–"}</td>
                    <td style={TD}>{e.gesamtPunkte}</td>
                    <td style={TD}>
                      <span style={{ ...ns, padding: "3px 10px", borderRadius: "5px", fontWeight: "600", fontSize: "0.82rem" }}>
                        {e.note ?? "–"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
        <button onClick={exportCSV} style={btnStyle}>↓ CSV</button>
        <button onClick={exportJSON} style={btnStyle}>↓ JSON</button>
        <button onClick={() => window.print()} style={btnStyle}>↓ PDF (Drucken)</button>
      </div>
    </div>
  );
}

const btnStyle = {
  border: "1px solid #d8d8d8",
  background: "white",
  padding: "6px 16px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.82rem",
  color: "#444",
  transition: "background 0.15s",
};
