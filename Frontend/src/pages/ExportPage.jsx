const NOTENSKALA = [
  { min: 95, note: 1.0 }, { min: 90, note: 1.3 }, { min: 85, note: 1.7 },
  { min: 80, note: 2.0 }, { min: 75, note: 2.3 }, { min: 70, note: 2.7 },
  { min: 65, note: 3.0 }, { min: 60, note: 3.3 }, { min: 55, note: 3.7 },
  { min: 50, note: 4.0 }, { min: 0,  note: 5.0 },
];

function berechneNote(punkte, maxPunkte) {
  if (!maxPunkte) return 5.0;
  const pct = (punkte / maxPunkte) * 100;
  return (NOTENSKALA.find((s) => pct >= s.min) ?? { note: 5.0 }).note;
}

function mitNoten(pruefung) {
  const maxGesamt = pruefung.aufgaben.reduce((s, a) => s + a.maxPunkte, 0);
  return pruefung.ergebnisse.map((e) => {
    const gesamt = e.punkte.reduce((s, p) => s + p, 0);
    return { ...e, gesamt, note: berechneNote(gesamt, maxGesamt), maxGesamt };
  });
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safe(name) {
  return name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
}

function baueCSV(pruefung) {
  const sep = ";";
  const em = mitNoten(pruefung);
  const maxGesamt = pruefung.aufgaben.reduce((s, a) => s + a.maxPunkte, 0);
  const datumStr = pruefung.datum
    ? new Date(pruefung.datum + "T00:00:00").toLocaleDateString("de-DE")
    : "";
  const aufgabenHeader = pruefung.aufgaben
    .map((a, i) => `"A${i + 1} – ${a.bezeichnung} (max. ${a.maxPunkte})"`)
    .join(sep);
  const header = ["Matrikelnummer", ...pruefung.aufgaben.map((_, i) => `A${i + 1}`), "Gesamt", "Note"].join(sep);
  const zeilen = em.map((e) =>
    [e.matrikelnummer, ...e.punkte, `${e.gesamt}/${maxGesamt}`, e.note.toFixed(1).replace(".", ",")].join(sep)
  );
  return [`"${pruefung.name}"${sep}${datumStr}`, aufgabenHeader, header, ...zeilen].join("\n");
}

function exportCSV(pruefung) {
  download("﻿" + baueCSV(pruefung), `${safe(pruefung.name)}_Ergebnisse.csv`, "text/csv;charset=utf-8;");
}

function exportJSON(pruefung) {
  const maxGesamt = pruefung.aufgaben.reduce((s, a) => s + a.maxPunkte, 0);
  const em = mitNoten(pruefung);
  const data = {
    ...pruefung,
    maxGesamt,
    ergebnisse: em.map(({ matrikelnummer, punkte, gesamt, note }) => ({ matrikelnummer, punkte, gesamt, note })),
    exportiertAm: new Date().toISOString(),
  };
  download(JSON.stringify(data, null, 2), `${safe(pruefung.name)}_Ergebnisse.json`, "application/json");
}

function exportAlleCSV(pruefungen) {
  const abschnitte = pruefungen.map((p) => baueCSV(p) + "\n");
  download("﻿" + abschnitte.join("\n"), "Alle_Pruefungen_Ergebnisse.csv", "text/csv;charset=utf-8;");
}

import { useBreakpoint } from "../hooks/useBreakpoint";

export default function ExportPage() {
  const { isMobile } = useBreakpoint();
  const pruefungen = JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]");
  const mitErgebnissen = pruefungen.filter((p) => p.ergebnisse.length > 0);

  return (
    <div style={{ padding: isMobile ? "16px" : "32px 36px", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        <h1 style={{ fontSize: isMobile ? "1.1rem" : "1.4rem", fontWeight: "600" }}>Export</h1>
        {mitErgebnissen.length > 1 && (
          <button onClick={() => exportAlleCSV(mitErgebnissen)} style={primaerBtn}>
            {isMobile ? "Alle CSV" : "Alle als CSV exportieren"}
          </button>
        )}
      </div>

      {pruefungen.length === 0 ? (
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "40px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center", color: "#aaa" }}>
          <p style={{ fontSize: "0.9rem" }}>Noch keine lokalen Prüfungen vorhanden.</p>
          <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>Lege über „+ Lokal anlegen" eine Prüfung an und trage Ergebnisse ein.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pruefungen.map((p) => {
            const maxGesamt = p.aufgaben.reduce((s, a) => s + a.maxPunkte, 0);
            const em = mitNoten(p);
            const bestanden = em.filter((e) => e.note <= 4.0).length;
            const datumStr = p.datum
              ? new Date(p.datum + "T00:00:00").toLocaleDateString("de-DE")
              : null;

            return (
              <div key={p.id} style={card}>
                {/* Kopfzeile */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>{p.name}</p>
                    <p style={{ color: "#999", fontSize: "0.8rem" }}>
                      {datumStr ? `${datumStr} · ` : ""}
                      {maxGesamt} Pkt. max · {em.length} Teilnehmer
                      {em.length > 0 && ` · ${bestanden} bestanden`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {em.length === 0 ? (
                      <span style={{ fontSize: "0.78rem", color: "#ccc" }}>Keine Ergebnisse</span>
                    ) : (
                      <>
                        <button onClick={() => exportCSV(p)} style={sekundaerBtn} title="Als CSV für Excel herunterladen">
                          CSV
                        </button>
                        <button onClick={() => exportJSON(p)} style={sekundaerBtn} title="Als JSON-Backup herunterladen">
                          JSON
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ergebnisvorschau */}
                {em.length > 0 && (
                  <div style={{ marginTop: "14px", overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: "0.82rem", width: "100%" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                          <th style={th}>Matrikelnummer</th>
                          {p.aufgaben.map((a, i) => (
                            <th key={i} style={{ ...th, textAlign: "center" }} title={a.bezeichnung}>
                              A{i + 1}
                            </th>
                          ))}
                          <th style={{ ...th, textAlign: "center" }}>Gesamt</th>
                          <th style={{ ...th, textAlign: "center" }}>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {em.map((e) => (
                          <tr key={e.matrikelnummer} style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <td style={td}>{e.matrikelnummer}</td>
                            {e.punkte.map((pkt, i) => (
                              <td key={i} style={{ ...td, textAlign: "center" }}>{pkt}</td>
                            ))}
                            <td style={{ ...td, textAlign: "center", fontWeight: "600" }}>
                              {e.gesamt} / {maxGesamt}
                            </td>
                            <td style={{ ...td, textAlign: "center", fontWeight: "700", color: e.note <= 4.0 ? "#2d5a4b" : "#c00" }}>
                              {e.note.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const card = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "18px 22px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const th = {
  padding: "6px 10px", textAlign: "left",
  fontSize: "0.75rem", fontWeight: "600", color: "#888",
};

const td = { padding: "8px 10px", verticalAlign: "middle" };

const primaerBtn = {
  backgroundColor: "#2d5a4b", color: "white", border: "none",
  borderRadius: "8px", padding: "9px 18px", cursor: "pointer",
  fontSize: "0.875rem", fontWeight: "500",
};

const sekundaerBtn = {
  border: "1px solid #c8d8d2", background: "white",
  padding: "6px 14px", borderRadius: "7px", cursor: "pointer",
  fontSize: "0.82rem", color: "#2d5a4b", fontWeight: "500",
};
