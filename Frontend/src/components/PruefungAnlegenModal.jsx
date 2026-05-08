import { useState, useRef } from "react";
import { api } from "../api";

const LEERE_AUFGABE = { bezeichnung: "", maxPunkte: "", papierTyp: "liniert", raumGroesse: "mittel" };

const BEARBEITUNGSRAUM_HOEHEN = { klein: 100, mittel: 200, gross: 380 };

function BearbeitungsRaum({ typ, hoehe }) {
  const base = {
    width: "100%",
    height: `${hoehe}px`,
    border: "1px solid #ccc",
    borderRadius: "3px",
    boxSizing: "border-box",
    marginTop: "6px",
  };

  if (typ === "liniert") {
    return (
      <div style={{
        ...base,
        backgroundImage: "repeating-linear-gradient(transparent, transparent 15px, #aac4ba 15px, #aac4ba 16px)",
        backgroundSize: "100% 16px",
        backgroundPosition: "0 8px",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }} />
    );
  }
  if (typ === "kariert") {
    return (
      <div style={{
        ...base,
        backgroundImage:
          "repeating-linear-gradient(transparent, transparent 15px, #aac4ba 15px, #aac4ba 16px), " +
          "repeating-linear-gradient(90deg, transparent, transparent 15px, #aac4ba 15px, #aac4ba 16px)",
        backgroundSize: "16px 16px",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }} />
    );
  }
  // leer
  return <div style={base} />;
}

export default function PruefungAnlegenModal({ onClose, onAngelegt }) {
  const [schritt, setSchritt] = useState("formular");
  const [klausurName, setKlausurName] = useState("");
  const [datum, setDatum] = useState("");
  const [aufgaben, setAufgaben] = useState([{ ...LEERE_AUFGABE }]);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [gespeichert, setGespeichert] = useState(null);
  const printRef = useRef(null);

  function aufgabeAendern(index, feld, wert) {
    setAufgaben((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [feld]: wert } : a))
    );
  }

  function aufgabeHinzufuegen() {
    setAufgaben((prev) => [...prev, { ...LEERE_AUFGABE }]);
  }

  function aufgabeEntfernen(index) {
    if (aufgaben.length === 1) return;
    setAufgaben((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSpeichern(e) {
    e.preventDefault();
    setFehler(null);

    if (!klausurName.trim()) {
      setFehler("Bitte einen Klausurtitel eingeben.");
      return;
    }
    for (const [i, a] of aufgaben.entries()) {
      if (!a.bezeichnung.trim()) {
        setFehler(`Aufgabe ${i + 1}: Aufgabenstellung fehlt.`);
        return;
      }
      if (!a.maxPunkte || Number(a.maxPunkte) <= 0) {
        setFehler(`Aufgabe ${i + 1}: Maximalpunktzahl muss größer als 0 sein.`);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await api.pruefungAnlegen({
        name: klausurName.trim(),
        datum: datum || null,
        aufgaben: aufgaben.map((a) => ({
          bezeichnung: a.bezeichnung.trim(),
          maxPunkte: Number(a.maxPunkte),
        })),
      });
      setGespeichert(result);
      setSchritt("template");
      if (onAngelegt) onAngelegt(result.pruefung);
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLoading(false);
    }
  }

  const gesamtMax = aufgaben.reduce((s, a) => s + (Number(a.maxPunkte) || 0), 0);

  function handlePrint() {
    const esc = (s) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const datumStr = datum
      ? new Date(datum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    const aufgabenHTML = aufgaben.map((a, i) => {
      const hoehe = { klein: 100, mittel: 200, gross: 380 }[a.raumGroesse] ?? 200;
      const raumBg =
        a.papierTyp === "liniert"
          ? "background-image:repeating-linear-gradient(transparent,transparent 15px,#aac4ba 15px,#aac4ba 16px);background-size:100% 16px;background-position:0 8px;"
          : a.papierTyp === "kariert"
          ? "background-image:repeating-linear-gradient(transparent,transparent 15px,#aac4ba 15px,#aac4ba 16px),repeating-linear-gradient(90deg,transparent,transparent 15px,#aac4ba 15px,#aac4ba 16px);background-size:16px 16px;"
          : "";
      return `
<div class="aufgabe">
  <div class="ah">
    <div class="anr">${i + 1}</div>
    <div class="atext">${esc(a.bezeichnung)}</div>
    <div class="apkt">
      <div class="plabel">Max. Punkte</div>
      <div class="pzahl">${a.maxPunkte}</div>
      <div class="plabel erreicht">Erreicht</div>
      <div class="ocr"></div>
    </div>
  </div>
  <div class="bereich" style="height:${hoehe}px;${raumBg}"></div>
</div>`;
    }).join("\n");

    const sumRows = aufgaben.map((a, i) => `
<tr>
  <td class="stdc">${i + 1}</td>
  <td class="stdc">${a.maxPunkte}</td>
  <td class="stde"><div class="ocrk"></div></td>
</tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<title>${esc(klausurName)}</title>
<style>
@page { size: A4 portrait; margin: 14mm 18mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:white}

/* ── Repeating header via table thead ── */
table.outer{width:100%;border-collapse:collapse;table-layout:fixed}
thead.rh td{padding-bottom:10px;border-bottom:2pt solid #2d5a4b}
.hd{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.htitle{font-size:13pt;font-weight:700}
.hmeta{display:flex;gap:10px;font-size:8.5pt;color:#444;align-items:center;flex-wrap:nowrap}
.hfield{display:flex;align-items:center;gap:4px;white-space:nowrap}
.hline{display:inline-block;border-bottom:1px solid #444}
.hline.l{min-width:100px}.hline.s{min-width:65px}

/* ── Studierenden-Info (nur Seite 1) ── */
.studi{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:12px 0 16px;break-inside:avoid}
.slabel{font-size:7pt;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.sline{height:24px;border-bottom:1.5px solid #222}

/* ── Aufgabe ── */
.aufgabe{break-inside:avoid;page-break-inside:avoid;margin-bottom:10px}
.ah{display:flex;align-items:stretch;border:1.5px solid #c8d8d2;border-radius:4px 4px 0 0;overflow:hidden;background:#f6faf8}
.anr{background:#2d5a4b;color:white;font-weight:700;font-size:11pt;min-width:38px;display:flex;align-items:center;justify-content:center;padding:8px;flex-shrink:0}
.atext{flex:1;padding:9px 12px;font-size:10pt;line-height:1.5;word-wrap:break-word}
.apkt{border-left:1.5px solid #c8d8d2;width:96px;flex-shrink:0;padding:6px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.plabel{font-size:6pt;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.04em;text-align:center;line-height:1.3}
.erreicht{margin-top:4px}
.pzahl{font-size:13pt;font-weight:700;color:#2d5a4b}
.ocr{width:64px;height:30px;border:2px solid #2d5a4b;border-radius:4px;background:#fafff9;margin-top:2px}
.bereich{border:1.5px solid #c8d8d2;border-top:none;border-radius:0 0 4px 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── Summentabelle ── */
.sumwrap{break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:flex-end;padding-top:12px}
table.sum{border-collapse:collapse;min-width:230px}
table.sum th{padding:6px 10px;font-size:7.5pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.04em;color:#555;border:1px solid #ddd;background:#f0f4f2}
.stdc{padding:5px 10px;font-size:9pt;border:1px solid #e8e8e8;vertical-align:middle;text-align:center}
.stde{padding:4px 8px;border:1px solid #e8e8e8;vertical-align:middle;min-width:80px}
.ocrk{height:26px;border:1.5px solid #888;border-radius:3px;background:#fafff9}
.sumges td{background:#f0f4f2;font-weight:700}
.hinweis{margin-top:10px;font-size:7pt;color:#bbb;text-align:center}
</style>
</head><body>
<table class="outer">
<thead class="rh"><tr><td>
  <div class="hd">
    <span class="htitle">${esc(klausurName)}</span>
    <div class="hmeta">
      ${datumStr ? `<span>Datum: <strong>${datumStr}</strong></span>` : ""}
      <span>Gesamt: <strong>${gesamtMax} Pkt.</strong></span>
      <span class="hfield">Name:<span class="hline l">&nbsp;</span></span>
      <span class="hfield">Matrikel:<span class="hline s">&nbsp;</span></span>
    </div>
  </div>
</td></tr></thead>
<tbody>
<tr><td style="position:relative">
  <div style="position:absolute;top:-45px;right:0;width:280px;height:45px;background:white;z-index:99"></div>
  <div class="studi">
    <div><div class="slabel">Name, Vorname</div><div class="sline"></div></div>
    <div><div class="slabel">Matrikelnummer</div><div class="sline"></div></div>
    <div><div class="slabel">Unterschrift</div><div class="sline"></div></div>
  </div>
</td></tr>
<tr><td>${aufgabenHTML}</td></tr>
<tr><td>
  <div class="sumwrap">
    <table class="sum">
      <thead><tr><th>Aufgabe</th><th>Max. Pkt.</th><th>Erreicht</th></tr></thead>
      <tbody>
        ${sumRows}
        <tr class="sumges">
          <td class="stdc" style="text-align:right">Gesamt</td>
          <td class="stdc">${gesamtMax}</td>
          <td class="stde"><div class="ocrk" style="border-color:#2d5a4b;border-width:2px"></div></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="hinweis">Punkte deutlich in die Felder eintragen · wird per Scan ausgewertet</p>
</td></tr>
</tbody>
</table>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { alert("Bitte Popups für diese Seite erlauben."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  }

  return (
    <>

      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200,
        }}
      >
        {/* ── SCHRITT 1: Formular ── */}
        {schritt === "formular" && (
          <div style={modalStyle}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Prüfung anlegen</h2>
            <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
              Klausurtitel, Datum, Aufgaben und Bearbeitungsraum eingeben.
            </p>

            <form onSubmit={handleSpeichern}>
              {/* Klausurtitel */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Klausurtitel</label>
                <input
                  type="text"
                  value={klausurName}
                  onChange={(e) => setKlausurName(e.target.value)}
                  placeholder="z. B. Datenbanken II – Klausur SS 2026"
                  disabled={loading}
                  style={inputStyle}
                />
              </div>

              {/* Datum */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Datum (optional)</label>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                />
              </div>

              {/* Aufgaben */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={labelStyle}>Aufgaben</label>
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>Aufgabenstellung · Max. Punkte</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {aufgaben.map((aufgabe, i) => (
                    <div key={i} style={{ border: "1px solid #e8e8e8", borderRadius: "8px", padding: "12px" }}>
                      {/* Zeile 1: Nummer + Aufgabenstellung + Punkte + Löschen */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", paddingTop: "10px", minWidth: "26px" }}>
                          <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: "600" }}>{i + 1}.</span>
                        </div>
                        <textarea
                          value={aufgabe.bezeichnung}
                          onChange={(e) => aufgabeAendern(i, "bezeichnung", e.target.value)}
                          placeholder={`Aufgabenstellung für Aufgabe ${i + 1}…`}
                          disabled={loading}
                          rows={2}
                          style={{ ...inputStyle, flex: 3, resize: "vertical", fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "8px" }}>
                          <input
                            type="number"
                            value={aufgabe.maxPunkte}
                            onChange={(e) => aufgabeAendern(i, "maxPunkte", e.target.value)}
                            placeholder="10"
                            min="1"
                            disabled={loading}
                            style={{ ...inputStyle, width: "70px", textAlign: "center" }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "#aaa", whiteSpace: "nowrap" }}>Pkt.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => aufgabeEntfernen(i)}
                          disabled={aufgaben.length === 1 || loading}
                          style={{
                            background: "none", border: "none",
                            color: aufgaben.length === 1 ? "#ccc" : "#e57373",
                            cursor: aufgaben.length === 1 ? "default" : "pointer",
                            fontSize: "1.2rem", padding: "8px 4px", flexShrink: 0,
                          }}
                        >×</button>
                      </div>
                      {/* Zeile 2: Bearbeitungsraum-Einstellungen */}
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "#999", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                          Bearbeitungsraum:
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {[["leer","Leer"],["liniert","Liniert"],["kariert","Kariert"]].map(([val, label]) => (
                            <button key={val} type="button"
                              onClick={() => aufgabeAendern(i, "papierTyp", val)}
                              style={{
                                padding: "4px 10px", borderRadius: "5px", fontSize: "0.75rem",
                                border: aufgabe.papierTyp === val ? "2px solid #2d5a4b" : "1px solid #ddd",
                                background: aufgabe.papierTyp === val ? "#f0f7f4" : "white",
                                color: aufgabe.papierTyp === val ? "#2d5a4b" : "#666",
                                fontWeight: aufgabe.papierTyp === val ? "600" : "400",
                                cursor: "pointer",
                              }}
                            >{label}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
                          {[["klein","S"],["mittel","M"],["gross","L"]].map(([val, label]) => (
                            <button key={val} type="button"
                              onClick={() => aufgabeAendern(i, "raumGroesse", val)}
                              style={{
                                padding: "4px 10px", borderRadius: "5px", fontSize: "0.75rem",
                                border: aufgabe.raumGroesse === val ? "2px solid #2d5a4b" : "1px solid #ddd",
                                background: aufgabe.raumGroesse === val ? "#f0f7f4" : "white",
                                color: aufgabe.raumGroesse === val ? "#2d5a4b" : "#666",
                                fontWeight: aufgabe.raumGroesse === val ? "600" : "400",
                                cursor: "pointer",
                              }}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={aufgabeHinzufuegen}
                  disabled={loading}
                  style={{
                    marginTop: "10px", background: "none",
                    border: "1px dashed #c0c0c0", borderRadius: "6px",
                    padding: "7px 14px", cursor: "pointer",
                    color: "#2d5a4b", fontSize: "0.82rem", width: "100%",
                  }}
                >
                  + Aufgabe hinzufügen
                </button>

                {gesamtMax > 0 && (
                  <p style={{ textAlign: "right", fontSize: "0.8rem", color: "#555", marginTop: "8px" }}>
                    Gesamt: <strong>{gesamtMax} Punkte</strong>
                  </p>
                )}
              </div>

              {fehler && <div style={fehlerBoxStyle}>{fehler}</div>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" onClick={onClose} disabled={loading} style={sekundaerBtnStyle}>
                  Abbrechen
                </button>
                <button type="submit" disabled={loading} style={primaerBtnStyle}>
                  {loading ? "Wird gespeichert…" : "Speichern & Template erstellen"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── SCHRITT 2: Template ── */}
        {schritt === "template" && gespeichert && (
          <div style={{ ...modalStyle, maxWidth: "740px" }}>
            {/* Toolbar (kein Druck) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "3px" }}>Template erstellt</h2>
                <p style={{ color: "#888", fontSize: "0.875rem" }}>Prüfung wurde gespeichert.</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={onClose} style={sekundaerBtnStyle}>Fertig</button>
                <button onClick={handlePrint} style={primaerBtnStyle}>Drucken</button>
              </div>
            </div>

            {/* ── Druckbares Template ── */}
            <div ref={printRef} style={{ ...templateContainerStyle, overflowX: "auto" }}>
              {/*
                Wrapper-Tabelle: <thead> wiederholt sich auf jeder Druckseite automatisch.
                Jede Aufgabe ist eine eigene <tr> mit break-inside:avoid.
              */}
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>

                {/* ── Wiederholender Kopf ── */}
                <thead>
                  <tr>
                    <td style={{ paddingBottom: "12px" }}>
                      {/* Großer Kopf (nur Seite 1 sieht ihn zuerst, aber er wiederholt sich kompakt) */}
                      <div style={{ borderBottom: "2px solid #2d5a4b", paddingBottom: "10px", marginBottom: "0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <h1 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#1a1a1a", margin: 0 }}>
                            {klausurName}
                          </h1>
                          <div style={{ display: "flex", gap: "20px", fontSize: "0.8rem", color: "#555" }}>
                            {datum && (
                              <span>Datum: <strong>{new Date(datum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong></span>
                            )}
                            <span>Gesamt: <strong>{gesamtMax} Pkt.</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </thead>

                <tbody>
                  {/* Studierenden-Info (nur Seite 1, einmalig) */}
                  <tr style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td style={{ paddingTop: "14px", paddingBottom: "18px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div>
                          <span style={templateLabelStyle}>Name, Vorname</span>
                          <div style={ausfuellFeldStyle} />
                        </div>
                        <div>
                          <span style={templateLabelStyle}>Matrikelnummer</span>
                          <div style={ausfuellFeldStyle} />
                        </div>
                        <div>
                          <span style={templateLabelStyle}>Unterschrift</span>
                          <div style={ausfuellFeldStyle} />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* ── Eine Aufgabe pro Zeile ── */}
                  {aufgaben.map((aufgabe, i) => (
                    <tr key={i} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ paddingBottom: "14px" }}>
                        {/* Aufgaben-Header */}
                        <div style={{
                          display: "flex", alignItems: "stretch",
                          border: "1.5px solid #c8d8d2", borderRadius: "5px 5px 0 0",
                          overflow: "hidden", backgroundColor: "#f6faf8",
                        }}>
                          <div style={{
                            backgroundColor: "#2d5a4b", color: "white",
                            fontWeight: "700", fontSize: "0.9rem",
                            padding: "10px 14px", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            minWidth: "44px",
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, padding: "10px 14px", fontSize: "0.85rem", color: "#1a1a1a", lineHeight: "1.5" }}>
                            {aufgabe.bezeichnung}
                          </div>
                          <div style={{
                            borderLeft: "1px solid #c8d8d2", padding: "8px 12px",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: "5px", minWidth: "110px",
                          }}>
                            <span style={{ fontSize: "0.68rem", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>Max. Punkte</span>
                            <span style={{ fontSize: "1rem", fontWeight: "700", color: "#2d5a4b" }}>{aufgabe.maxPunkte}</span>
                            <span style={{ fontSize: "0.68rem", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "4px" }}>Erreicht</span>
                            <div style={{ width: "72px", height: "34px", border: "2px solid #2d5a4b", borderRadius: "4px", backgroundColor: "#fafff9" }} />
                          </div>
                        </div>
                        {/* Bearbeitungsraum */}
                        <BearbeitungsRaum typ={aufgabe.papierTyp} hoehe={BEARBEITUNGSRAUM_HOEHEN[aufgabe.raumGroesse]} />
                      </td>
                    </tr>
                  ))}

                  {/* Summentabelle */}
                  <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                    <td style={{ paddingTop: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <table style={{ borderCollapse: "collapse", minWidth: "260px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f0f4f2" }}>
                              <th style={thStyle}>Aufgabe</th>
                              <th style={thStyle}>Max. Pkt.</th>
                              <th style={{ ...thStyle, width: "90px" }}>Erreicht</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aufgaben.map((a, i) => (
                              <tr key={i}>
                                <td style={{ ...tdStyle, textAlign: "center" }}>{i + 1}</td>
                                <td style={{ ...tdStyle, textAlign: "center" }}>{a.maxPunkte}</td>
                                <td style={{ padding: "5px 8px" }}><div style={ocrFeldKleinStyle} /></td>
                              </tr>
                            ))}
                            <tr style={{ backgroundColor: "#f0f4f2", fontWeight: "700" }}>
                              <td style={{ ...tdStyle, textAlign: "right" }}>Gesamt</td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>{gesamtMax}</td>
                              <td style={{ padding: "5px 8px" }}>
                                <div style={{ ...ocrFeldKleinStyle, borderColor: "#2d5a4b", borderWidth: "2px" }} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p style={{ marginTop: "12px", fontSize: "0.7rem", color: "#bbb", textAlign: "center" }}>
                        Punkte deutlich in die Felder eintragen · wird per Scan ausgewertet
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const modalStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "32px",
  width: "620px",
  maxWidth: "95vw",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const templateContainerStyle = {
  backgroundColor: "white",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "24px 28px",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "600",
  color: "#555",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const templateLabelStyle = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: "600",
  color: "#999",
  marginBottom: "3px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "0.875rem",
  color: "#333",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "white",
};

const ausfuellFeldStyle = {
  height: "24px",
  borderBottom: "1.5px solid #333",
  width: "100%",
};

const ocrFeldKleinStyle = {
  height: "28px",
  border: "1.5px solid #888",
  borderRadius: "3px",
  backgroundColor: "#fafff9",
  width: "100%",
};

const thStyle = {
  padding: "8px 10px",
  fontSize: "0.72rem",
  fontWeight: "700",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#555",
  border: "1px solid #ddd",
};

const tdStyle = {
  padding: "7px 10px",
  fontSize: "0.82rem",
  border: "1px solid #e8e8e8",
  verticalAlign: "middle",
};

const fehlerBoxStyle = {
  marginTop: "16px",
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "#c00",
  fontSize: "0.82rem",
};

const primaerBtnStyle = {
  backgroundColor: "#2d5a4b",
  color: "white",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.875rem",
};

const sekundaerBtnStyle = {
  border: "1px solid #d0d0d0",
  background: "white",
  padding: "8px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  color: "#555",
  fontSize: "0.875rem",
};
