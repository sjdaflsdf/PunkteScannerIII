import { useState, useEffect } from "react";
import { api } from "../api";

function noteStyle(noteStr) {
  if (!noteStr) return {};
  const n = parseFloat(String(noteStr).replace(",", "."));
  if (n <= 1.5) return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
  if (n <= 2.5) return { backgroundColor: "#f1f8e9", color: "#558b2f" };
  if (n <= 3.5) return { backgroundColor: "#fff8e1", color: "#e65100" };
  if (n <= 4.0) return { backgroundColor: "#fce4ec", color: "#c62828" };
  return { backgroundColor: "#ffebee", color: "#b71c1c" };
}

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

function exportCSV(ergebnisse) {
  const kopf = ["Matrikel-Nr.", "Name", "Gesamt", "Note"].join(";");
  const zeilen = ergebnisse.map((e) =>
    [e.matrikelNr ?? e.matrikel ?? "", e.name ?? "", e.gesamt ?? "", e.note ?? ""].join(";")
  );
  const csv = [kopf, ...zeilen].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ergebnisse.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ErgebnisseTabelle({ pruefungId }) {
  const [daten, setDaten] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    if (!pruefungId) return;
    setLoading(true);
    setFehler(null);
    setDaten(null);

    api.getPruefungErgebnisse(pruefungId)
      .then(setDaten)
      .catch((e) => setFehler(e.message))
      .finally(() => setLoading(false));
  }, [pruefungId]);

  const pruefungName  = daten?.pruefungName ?? "";
  const aufgabenConfig = daten?.aufgabenConfig ?? [];
  const ergebnisse    = daten?.ergebnisse ?? [];
  const maxGesamt     = daten?.maxGesamt ?? aufgabenConfig.reduce((s, a) => s + (a.max ?? 0), 0);

  return (
    <div>
      <h3 style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: "16px" }}>
        Ergebnisse{pruefungName ? ` – ${pruefungName}` : ""}
      </h3>

      {!pruefungId && (
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Wähle eine Prüfung aus der Liste oben.</p>
      )}
      {loading && (
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Lade Ergebnisse…</p>
      )}
      {fehler && (
        <div style={fehlerBoxStyle}><strong>Fehler:</strong> {fehler}</div>
      )}
      {!loading && !fehler && pruefungId && ergebnisse.length === 0 && (
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Keine Ergebnisse vorhanden.</p>
      )}

      {!loading && !fehler && ergebnisse.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
              <thead>
                <tr>
                  <th style={TH}>Matrikel-Nr.</th>
                  <th style={TH}>Name</th>
                  {aufgabenConfig.map((a) => (
                    <th key={a.label} style={TH}>{a.label} /{a.max}</th>
                  ))}
                  <th style={TH}>Gesamt</th>
                  <th style={TH}>Note</th>
                </tr>
              </thead>
              <tbody>
                {ergebnisse.map((e) => {
                  const punkte = e.aufgaben ?? [];
                  const gesamt = typeof e.gesamt === "number"
                    ? e.gesamt
                    : punkte.reduce((s, p) => s + (p ?? 0), 0);
                  const ns = noteStyle(e.note);
                  return (
                    <tr
                      key={e.matrikelNr ?? e.matrikel ?? e.id}
                      onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = "#fafafa")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = "")}
                    >
                      <td style={{ ...TD, color: "#888" }}>{e.matrikelNr ?? e.matrikel ?? "–"}</td>
                      <td style={{ ...TD, fontWeight: "500" }}>{e.name}</td>
                      {punkte.map((p, i) => (
                        <td key={i} style={TD}>{p}</td>
                      ))}
                      <td style={TD}>{gesamt} / {maxGesamt}</td>
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

          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => exportCSV(ergebnisse)}
              style={exportBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              ↓ CSV
            </button>
            {["↓ PDF", "↓ Excel"].map((label) => (
              <button
                key={label}
                style={{ ...exportBtnStyle, color: "#aaa", cursor: "not-allowed" }}
                title="Noch nicht verfügbar"
                disabled
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const exportBtnStyle = {
  border: "1px solid #d8d8d8",
  background: "white",
  padding: "6px 16px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.82rem",
  color: "#444",
  transition: "background 0.15s",
};

const fehlerBoxStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#c00",
  fontSize: "0.82rem",
  marginBottom: "8px",
};
