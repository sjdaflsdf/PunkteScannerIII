import { useState, useEffect } from "react";

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

function ladeLokalePruefung(id) {
  const alle = JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]");
  return alle.find((p) => p.id === id) ?? null;
}

function speichereLokalePruefung(updated) {
  const alle = JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]");
  localStorage.setItem(
    "pruefungen_lokal",
    JSON.stringify(alle.map((p) => (p.id === updated.id ? updated : p)))
  );
}

export default function LokalePruefungDetail({ pruefung: initialPruefung, onZurueck, onGeloescht }) {
  const [pruefung, setPruefung] = useState(initialPruefung);
  const [neueMatrikel, setNeueMatrikel] = useState("");
  const [neuePunkte, setNeuePunkte] = useState(() => initialPruefung.aufgaben.map(() => ""));
  const [editId, setEditId] = useState(null);
  const [editPunkte, setEditPunkte] = useState([]);
  const [matrikelFehler, setMatrikelFehler] = useState(null);

  useEffect(() => {
    const fresh = ladeLokalePruefung(initialPruefung.id);
    if (fresh) setPruefung(fresh);
  }, [initialPruefung.id]);

  const maxGesamt = pruefung.aufgaben.reduce((s, a) => s + a.maxPunkte, 0);

  function update(updated) {
    speichereLokalePruefung(updated);
    setPruefung(updated);
  }

  function ergebnisHinzufuegen() {
    setMatrikelFehler(null);
    const matrikel = neueMatrikel.trim();
    if (!matrikel) { setMatrikelFehler("Matrikelnummer fehlt."); return; }
    if (pruefung.ergebnisse.some((e) => e.matrikelnummer === matrikel)) {
      setMatrikelFehler("Diese Matrikelnummer existiert bereits.");
      return;
    }
    const punkte = neuePunkte.map((p, i) =>
      Math.min(Math.max(Number(p) || 0, 0), pruefung.aufgaben[i].maxPunkte)
    );
    update({ ...pruefung, ergebnisse: [...pruefung.ergebnisse, { matrikelnummer: matrikel, punkte }] });
    setNeueMatrikel("");
    setNeuePunkte(pruefung.aufgaben.map(() => ""));
  }

  function ergebnisLoeschen(matrikel) {
    update({ ...pruefung, ergebnisse: pruefung.ergebnisse.filter((e) => e.matrikelnummer !== matrikel) });
  }

  function startEdit(ergebnis) {
    setEditId(ergebnis.matrikelnummer);
    setEditPunkte([...ergebnis.punkte]);
  }

  function saveEdit(matrikel) {
    const punkte = editPunkte.map((p, i) =>
      Math.min(Math.max(Number(p) || 0, 0), pruefung.aufgaben[i].maxPunkte)
    );
    update({
      ...pruefung,
      ergebnisse: pruefung.ergebnisse.map((e) => e.matrikelnummer === matrikel ? { ...e, punkte } : e),
    });
    setEditId(null);
  }

  const ergebnisseMitNote = pruefung.ergebnisse.map((e) => {
    const gesamt = e.punkte.reduce((s, p) => s + p, 0);
    return { ...e, gesamt, note: berechneNote(gesamt, maxGesamt) };
  });

  const bestanden = ergebnisseMitNote.filter((e) => e.note <= 4.0).length;
  const durchschnittNote = ergebnisseMitNote.length
    ? (ergebnisseMitNote.reduce((s, e) => s + e.note, 0) / ergebnisseMitNote.length).toFixed(2)
    : null;
  const durchschnittPunkte = ergebnisseMitNote.length
    ? (ergebnisseMitNote.reduce((s, e) => s + e.gesamt, 0) / ergebnisseMitNote.length).toFixed(1)
    : null;

  const alleNoten = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0];
  const verteilung = alleNoten.map((note) => ({
    note,
    anzahl: ergebnisseMitNote.filter((e) => e.note === note).length,
  })).filter((v) => v.anzahl > 0);
  const maxAnzahl = Math.max(...verteilung.map((v) => v.anzahl), 1);

  const datumStr = pruefung.datum
    ? new Date(pruefung.datum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  function exportCSV() {
    const sep = ";";
    const aufgabenHeader = pruefung.aufgaben.map((a, i) => `"A${i + 1} – ${a.bezeichnung} (max. ${a.maxPunkte})"`).join(sep);
    const header = ["Matrikelnummer", ...pruefung.aufgaben.map((_, i) => `A${i + 1}`), "Gesamt", "Note"].join(sep);
    const zeilen = ergebnisseMitNote.map((e) =>
      [e.matrikelnummer, ...e.punkte, e.gesamt, e.note.toFixed(1).replace(".", ",")].join(sep)
    );
    const csv = [
      `"${pruefung.name}"${sep}${datumStr ?? ""}`,
      aufgabenHeader,
      header,
      ...zeilen,
    ].join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pruefung.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Ergebnisse.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = {
      ...pruefung,
      ergebnisse: ergebnisseMitNote.map((e) => ({
        matrikelnummer: e.matrikelnummer,
        punkte: e.punkte,
        gesamt: e.gesamt,
        note: e.note,
      })),
      maxGesamt,
      exportiertAm: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pruefung.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Ergebnisse.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1050px" }}>

      {/* Header */}
      <button onClick={onZurueck} style={zurueckBtn}>← Zurück zur Übersicht</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "4px" }}>{pruefung.name}</h1>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>
            {datumStr ? `${datumStr} · ` : ""}{maxGesamt} Pkt. max
            <span style={{ marginLeft: "8px", backgroundColor: "#fff8e1", color: "#a16800", padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "600", border: "1px solid #ffe082" }}>
              Lokal
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={exportCSV}
            disabled={ergebnisseMitNote.length === 0}
            title={ergebnisseMitNote.length === 0 ? "Noch keine Ergebnisse vorhanden" : "Als CSV exportieren (Excel)"}
            style={{
              border: "1px solid #c8d8d2",
              background: "white",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: ergebnisseMitNote.length === 0 ? "default" : "pointer",
              fontSize: "0.82rem",
              color: ergebnisseMitNote.length === 0 ? "#bbb" : "#2d5a4b",
              fontWeight: "500",
            }}
          >
            CSV exportieren
          </button>
          <button
            onClick={exportJSON}
            disabled={ergebnisseMitNote.length === 0}
            title={ergebnisseMitNote.length === 0 ? "Noch keine Ergebnisse vorhanden" : "Als JSON exportieren (Backup)"}
            style={{
              border: "1px solid #c8d8d2",
              background: "white",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: ergebnisseMitNote.length === 0 ? "default" : "pointer",
              fontSize: "0.82rem",
              color: ergebnisseMitNote.length === 0 ? "#bbb" : "#2d5a4b",
              fontWeight: "500",
            }}
          >
            JSON exportieren
          </button>
          <button
            onClick={() => {
              if (window.confirm(`"${pruefung.name}" wirklich löschen? Alle Ergebnisse gehen verloren.`)) {
                const alle = JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]");
                localStorage.setItem("pruefungen_lokal", JSON.stringify(alle.filter((p) => p.id !== pruefung.id)));
                onZurueck();
              }
            }}
            style={{
              border: "1px solid #fcc",
              background: "white",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.82rem",
              color: "#e57373",
            }}
          >
            Prüfung löschen
          </button>
        </div>
      </div>

      {/* Stats */}
      {ergebnisseMitNote.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
          <StatBox label="Teilnehmer" value={ergebnisseMitNote.length} />
          <StatBox label="Ø Punkte" value={`${durchschnittPunkte} / ${maxGesamt}`} />
          <StatBox label="Ø Note" value={durchschnittNote} />
          <StatBox
            label="Bestehensquote"
            value={`${Math.round((bestanden / ergebnisseMitNote.length) * 100)} %`}
            color={bestanden / ergebnisseMitNote.length >= 0.5 ? "#2d5a4b" : "#c00"}
          />
        </div>
      )}

      {/* Ergebnistabelle */}
      <div style={card}>
        <h2 style={sectionLabel}>Ergebnisse</h2>

        {matrikelFehler && (
          <div style={{ backgroundColor: "#fff3f3", border: "1px solid #fcc", borderRadius: "6px", padding: "8px 12px", color: "#c00", fontSize: "0.82rem", marginBottom: "12px" }}>
            {matrikelFehler}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e8e8e8" }}>
                <th style={th}>Matrikelnummer</th>
                {pruefung.aufgaben.map((a, i) => (
                  <th key={i} style={{ ...th, textAlign: "center" }} title={a.bezeichnung}>
                    A{i + 1}<br />
                    <span style={{ fontWeight: "400", color: "#aaa", fontSize: "0.72rem" }}>/{a.maxPunkte}</span>
                  </th>
                ))}
                <th style={{ ...th, textAlign: "center" }}>Gesamt</th>
                <th style={{ ...th, textAlign: "center" }}>Note</th>
                <th style={{ ...th, width: "90px" }} />
              </tr>
            </thead>
            <tbody>
              {ergebnisseMitNote.map((e) => (
                <tr key={e.matrikelnummer} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={td}><strong>{e.matrikelnummer}</strong></td>
                  {editId === e.matrikelnummer
                    ? pruefung.aufgaben.map((a, i) => (
                        <td key={i} style={{ ...td, textAlign: "center" }}>
                          <input
                            type="number"
                            value={editPunkte[i] ?? ""}
                            onChange={(ev) =>
                              setEditPunkte((prev) => prev.map((v, j) => (j === i ? ev.target.value : v)))
                            }
                            min={0}
                            max={a.maxPunkte}
                            style={numInput}
                          />
                        </td>
                      ))
                    : e.punkte.map((p, i) => (
                        <td key={i} style={{ ...td, textAlign: "center" }}>{p}</td>
                      ))
                  }
                  <td style={{ ...td, textAlign: "center", fontWeight: "600" }}>
                    {e.gesamt} / {maxGesamt}
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: "700", color: e.note <= 4.0 ? "#2d5a4b" : "#c00" }}>
                    {e.note.toFixed(1)}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {editId === e.matrikelnummer ? (
                      <>
                        <button onClick={() => saveEdit(e.matrikelnummer)} style={smallBtnPrimary}>✓ Speichern</button>
                        <button onClick={() => setEditId(null)} style={{ ...smallBtn, marginLeft: "4px" }}>✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(e)} style={smallBtn}>✎</button>
                        <button onClick={() => ergebnisLoeschen(e.matrikelnummer)} style={{ ...smallBtn, color: "#e57373", marginLeft: "4px" }}>×</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {/* Neue Zeile */}
              <tr style={{ backgroundColor: "#f6fdf9", borderTop: "2px solid #d4edda" }}>
                <td style={td}>
                  <input
                    type="text"
                    value={neueMatrikel}
                    onChange={(e) => { setNeueMatrikel(e.target.value); setMatrikelFehler(null); }}
                    onKeyDown={(e) => e.key === "Enter" && ergebnisHinzufuegen()}
                    placeholder="Matrikelnummer"
                    style={{ ...numInput, width: "140px" }}
                  />
                </td>
                {pruefung.aufgaben.map((a, i) => (
                  <td key={i} style={{ ...td, textAlign: "center" }}>
                    <input
                      type="number"
                      value={neuePunkte[i] ?? ""}
                      onChange={(ev) =>
                        setNeuePunkte((prev) => prev.map((v, j) => (j === i ? ev.target.value : v)))
                      }
                      onKeyDown={(e) => e.key === "Enter" && ergebnisHinzufuegen()}
                      placeholder="0"
                      min={0}
                      max={a.maxPunkte}
                      style={numInput}
                    />
                  </td>
                ))}
                <td style={td} />
                <td style={td} />
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={ergebnisHinzufuegen} style={smallBtnPrimary}>+ Hinzufügen</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {pruefung.ergebnisse.length === 0 && (
          <p style={{ color: "#bbb", fontSize: "0.82rem", textAlign: "center", paddingTop: "12px" }}>
            Noch keine Ergebnisse eingetragen. Matrikelnummer und Punkte eingeben, dann "+ Hinzufügen".
          </p>
        )}
      </div>

      {/* Notenverteilung */}
      {ergebnisseMitNote.length > 0 && (
        <div style={card}>
          <h2 style={sectionLabel}>Notenverteilung</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "16px" }}>
            {verteilung.map((v) => (
              <div key={v.note} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "#888" }}>{v.anzahl}×</span>
                <div style={{
                  width: "48px",
                  height: `${Math.round((v.anzahl / maxAnzahl) * 80) + 20}px`,
                  backgroundColor: v.note <= 4.0 ? "#2d5a4b" : "#e57373",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.2s",
                }} />
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: v.note <= 4.0 ? "#2d5a4b" : "#c00" }}>
                  {v.note.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Notenübersichtstabelle */}
          <table style={{ borderCollapse: "collapse", fontSize: "0.82rem", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <th style={{ ...th, textAlign: "left" }}>Note</th>
                <th style={{ ...th, textAlign: "center" }}>Anzahl</th>
                <th style={{ ...th, textAlign: "center" }}>Anteil</th>
                <th style={{ ...th, textAlign: "left" }}>Balken</th>
              </tr>
            </thead>
            <tbody>
              {alleNoten.map((note) => {
                const anzahl = ergebnisseMitNote.filter((e) => e.note === note).length;
                const anteil = ergebnisseMitNote.length ? Math.round((anzahl / ergebnisseMitNote.length) * 100) : 0;
                return (
                  <tr key={note} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ ...td, fontWeight: "600", color: note <= 4.0 ? "#2d5a4b" : "#c00" }}>{note.toFixed(1)}</td>
                    <td style={{ ...td, textAlign: "center" }}>{anzahl}</td>
                    <td style={{ ...td, textAlign: "center", color: "#888" }}>{anteil} %</td>
                    <td style={td}>
                      <div style={{
                        height: "10px",
                        width: `${anteil}%`,
                        minWidth: anzahl > 0 ? "4px" : "0",
                        backgroundColor: note <= 4.0 ? "#2d5a4b" : "#e57373",
                        borderRadius: "2px",
                        opacity: 0.75,
                      }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aufgabenübersicht */}
      <div style={card}>
        <h2 style={sectionLabel}>Aufgaben</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pruefung.aufgaben.map((a, i) => {
            const durchschnittAufgabe = ergebnisseMitNote.length
              ? (ergebnisseMitNote.reduce((s, e) => s + (e.punkte[i] || 0), 0) / ergebnisseMitNote.length).toFixed(1)
              : null;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", border: "1px solid #e8e8e8", borderRadius: "8px", backgroundColor: "#fafafa" }}>
                <div style={{ backgroundColor: "#2d5a4b", color: "white", fontWeight: "700", fontSize: "0.8rem", borderRadius: "5px", padding: "4px 10px", flexShrink: 0 }}>
                  A{i + 1}
                </div>
                <div style={{ flex: 1, fontSize: "0.875rem" }}>{a.bezeichnung}</div>
                <div style={{ fontSize: "0.82rem", color: "#888", whiteSpace: "nowrap" }}>
                  Max: <strong style={{ color: "#2d5a4b" }}>{a.maxPunkte} Pkt.</strong>
                  {durchschnittAufgabe && <span style={{ marginLeft: "12px" }}>Ø {durchschnittAufgabe} Pkt.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "#2d5a4b" }) {
  return (
    <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#999", marginBottom: "6px" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.5rem", fontWeight: "700", color }}>{value}</p>
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

const sectionLabel = {
  fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#999", marginBottom: "14px",
};

const zurueckBtn = {
  background: "none", border: "none", color: "#2d5a4b",
  cursor: "pointer", fontSize: "0.875rem", padding: "0 0 12px 0",
  display: "block",
};

const th = {
  padding: "8px 12px", textAlign: "left", fontSize: "0.78rem",
  fontWeight: "600", color: "#666", whiteSpace: "nowrap",
};

const td = { padding: "10px 12px", verticalAlign: "middle" };

const numInput = {
  border: "1px solid #e0e0e0", borderRadius: "5px",
  padding: "5px 8px", fontSize: "0.875rem", textAlign: "center",
  width: "68px", outline: "none", boxSizing: "border-box",
};

const smallBtn = {
  background: "none", border: "1px solid #ddd", borderRadius: "4px",
  padding: "3px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#555",
};

const smallBtnPrimary = {
  backgroundColor: "#2d5a4b", color: "white", border: "none",
  borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
  fontSize: "0.8rem", fontWeight: "500",
};
