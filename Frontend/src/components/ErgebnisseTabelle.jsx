const AUFGABEN_CONFIG = [
  { label: "Aufgabe 1", max: 20 },
  { label: "Aufgabe 2", max: 30 },
  { label: "Aufgabe 3", max: 30 },
];

const ERGEBNISSE = [
  { matrikel: "12345678", name: "Müller, Anna",    aufgaben: [18, 24, 28], note: "1,3" },
  { matrikel: "23456789", name: "Schmidt, Tobias", aufgaben: [14, 19, 22], note: "2,7" },
  { matrikel: "34567890", name: "Weber, Lena",     aufgaben: [10, 15, 18], note: "3,7" },
  { matrikel: "45678901", name: "Fischer, Max",    aufgaben: [8,  12, 14], note: "5,0" },
];

const MAX_GESAMT = AUFGABEN_CONFIG.reduce((s, a) => s + a.max, 0);

function noteStyle(noteStr) {
  const n = parseFloat(noteStr.replace(",", "."));
  if (n <= 1.5) return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
  if (n <= 2.5) return { backgroundColor: "#f1f8e9", color: "#558b2f" };
  if (n <= 3.5) return { backgroundColor: "#fff8e1", color: "#e65100" };
  if (n <= 4.0) return { backgroundColor: "#fce4ec", color: "#c62828" };
  return { backgroundColor: "#ffebee", color: "#b71c1c" };
}

const TH = { padding: "10px 14px", borderBottom: "2px solid #e8e8e8", color: "#666", fontWeight: "600", fontSize: "0.8rem", textAlign: "left", whiteSpace: "nowrap" };
const TD = { padding: "10px 14px", borderBottom: "1px solid #f2f2f2", fontSize: "0.875rem", color: "#333" };

// ── Export Funktionen ──────────────────────────────────
function exportCSV() {
  const header = ["Matrikel-Nr.", "Name",
    ...AUFGABEN_CONFIG.map(a => a.label), "Gesamt", "Note"];

  const rows = ERGEBNISSE.map(e => {
    const gesamt = e.aufgaben.reduce((s, p) => s + p, 0);
    return [e.matrikel, e.name, ...e.aufgaben,
      `${gesamt}/${MAX_GESAMT}`, e.note];
  });

  const csv = [header, ...rows]
      .map(row => row.join(","))
      .join("\n");

  downloadDatei(csv, "ergebnisse.csv", "text/csv");
}

function exportJSON() {
  const data = ERGEBNISSE.map(e => ({
    matrikel: e.matrikel,
    name: e.name,
    aufgaben: e.aufgaben,
    gesamt: e.aufgaben.reduce((s, p) => s + p, 0),
    note: e.note
  }));
  downloadDatei(
      JSON.stringify(data, null, 2),
      "ergebnisse.json",
      "application/json"
  );
}

function downloadDatei(inhalt, dateiname, typ) {
  const blob = new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Hauptkomponente ────────────────────────────────────
export default function ErgebnisseTabelle({
                                            pruefungName = "Datenbanken II"
                                          }) {
  return (
      <div>
        <h3 style={{ fontSize: "0.75rem", fontWeight: "700",
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: "#888", marginBottom: "16px" }}>
          Ergebnisse – {pruefungName}
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse",
            minWidth: "560px" }}>
            <thead>
            <tr>
              <th style={TH}>Matrikel-Nr.</th>
              <th style={TH}>Name</th>
              {AUFGABEN_CONFIG.map((a) => (
                  <th key={a.label} style={TH}>{a.label} /{a.max}</th>
              ))}
              <th style={TH}>Gesamt</th>
              <th style={TH}>Note</th>
            </tr>
            </thead>
            <tbody>
            {ERGEBNISSE.map((e) => {
              const gesamt = e.aufgaben.reduce((s, p) => s + p, 0);
              const ns = noteStyle(e.note);
              return (
                  <tr key={e.matrikel}
                      onMouseEnter={(ev) =>
                          ev.currentTarget.style.backgroundColor = "#fafafa"}
                      onMouseLeave={(ev) =>
                          ev.currentTarget.style.backgroundColor = ""}
                  >
                    <td style={{ ...TD, color: "#888" }}>{e.matrikel}</td>
                    <td style={{ ...TD, fontWeight: "500" }}>{e.name}</td>
                    {e.aufgaben.map((p, i) => (
                        <td key={i} style={TD}>{p}</td>
                    ))}
                    <td style={TD}>{gesamt} / {MAX_GESAMT}</td>
                    <td style={TD}>
                    <span style={{
                      ...ns,
                      padding: "3px 10px",
                      borderRadius: "5px",
                      fontWeight: "600",
                      fontSize: "0.82rem",
                    }}>
                      {e.note}
                    </span>
                    </td>
                  </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* ── Export Buttons ── */}
        <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>

          <button
              onClick={exportCSV}
              style={btnStyle}
              onMouseEnter={(e) =>
                  e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseLeave={(e) =>
                  e.currentTarget.style.backgroundColor = "white"}
          >
            ↓ CSV
          </button>

          <button
              onClick={exportJSON}
              style={btnStyle}
              onMouseEnter={(e) =>
                  e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseLeave={(e) =>
                  e.currentTarget.style.backgroundColor = "white"}
          >
            ↓ JSON
          </button>

          <button
              onClick={() => window.print()}
              style={btnStyle}
              onMouseEnter={(e) =>
                  e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseLeave={(e) =>
                  e.currentTarget.style.backgroundColor = "white"}
          >
            ↓ PDF (Drucken)
          </button>

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