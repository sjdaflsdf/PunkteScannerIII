import { useState, useRef } from "react";
import { api } from "../api";
import { ARUCO_MARKERS, ARUCO_TASK_MARKERS } from "../arucoMarkers";

const LEERE_AUFGABE = { bezeichnung: "", maxPunkte: "", papierTyp: "liniert", raumGroesse: "mittel" };

const BEARBEITUNGSRAUM_HOEHEN = { klein: 150, mittel: 375, gross: 600 };

const DEFAULT_NOTENSCHLUESSEL = [
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
        backgroundPosition: "0 15px",
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
  const [istStandardNotenschluessel, setIstStandardNotenschluessel] = useState(true);
  const [notenschluessel, setNotenschluessel] = useState(DEFAULT_NOTENSCHLUESSEL);
  const printRef = useRef(null);

  function schwelleAendern(index, wert) {
    setNotenschluessel((prev) =>
      prev.map((n, i) => (i === index ? { ...n, schwelle: Number(wert) } : n))
    );
  }

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
        istStandardNotenschluessel,
        notenschluessel: istStandardNotenschluessel ? null : notenschluessel,
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
      const hoehe = { klein: 150, mittel: 375, gross: 600 }[a.raumGroesse] ?? 375;
      const raumBg =
        a.papierTyp === "liniert"
          ? "background-image:repeating-linear-gradient(transparent,transparent 15px,#aac4ba 15px,#aac4ba 16px);background-size:100% 16px;background-position:0 15px;"
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
      ${ARUCO_TASK_MARKERS[i] ? `<img class="taskmarker" src="${ARUCO_TASK_MARKERS[i]}">` : `<div class="plabel erreicht">A${i + 1} ERREICHT</div>`}
      <div class="ocr"><div class="ocrdigit-z"></div><div class="ocrdigit-e"></div></div>
    </div>
  </div>
  <div class="bereich" style="height:${hoehe}px;${raumBg}"></div>
</div>`;
    }).join("\n");


    const html = `<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<title>${esc(klausurName)}</title>
<style>
/* margin:0 → die Seitenränder kommen aus dem Tabellen-Padding (wiederholt sich pro
   Druckseite). Nur so liegen die position:fixed-Eckmarker an der echten Papierkante
   (mit @page-margin positioniert Chrome fixed relativ zum Inhaltsbereich → Marker im Text). */
@page { size: A4 portrait; margin: 0; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:white}

/* ── Repeating header via table thead ── */
table.outer{width:100%;border-collapse:collapse;table-layout:fixed}
.outer td{padding-left:18mm;padding-right:18mm}      /* seitliche Ränder, jede Seite */
thead.rh td{padding-top:16mm;padding-bottom:12px}    /* oberer Rand, klärt die Eckmarker */
tfoot.rf td{height:28mm}                             /* unterer Rand, hält Inhalt von den (tiefer gesetzten) unteren Markern fern */
.hbox{border:1.5pt solid #2d5a4b;border-radius:5px;padding:10px 14px}
.hd{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;border-bottom:1pt solid #c8d8d2;padding-bottom:8px;margin-bottom:8px}
.htitle{font-size:13pt;font-weight:700}
.hmeta{display:flex;gap:10px;font-size:8.5pt;color:#444;align-items:center;flex-wrap:nowrap}

.studi{display:grid;grid-template-columns:2fr 1fr;gap:14px}
.slabel{font-size:7pt;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.sline{height:24px;border-bottom:1.5px solid #222}

/* ── Aufgabe ── */
.aufgabe{margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}
.ah{display:flex;align-items:stretch;border:1.5px solid #c8d8d2;border-radius:4px 4px 0 0;overflow:hidden;background:#f6faf8}
.anr{background:#2d5a4b;color:white;font-weight:700;font-size:11pt;min-width:38px;display:flex;align-items:center;justify-content:center;padding:8px;flex-shrink:0}
.atext{flex:1;padding:9px 12px;font-size:10pt;line-height:1.5;word-wrap:break-word}
.apkt{border-left:4px solid #000;width:140px;flex-shrink:0;padding:6px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.plabel{font-size:6pt;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.04em;text-align:center;line-height:1.3}
.erreicht{margin-top:4px;font-size:7pt;font-weight:900;color:#000;letter-spacing:.06em}
.pzahl{font-size:13pt;font-weight:700;color:#2d5a4b}
.taskmarker{width:6mm;height:6mm;image-rendering:pixelated;margin:2px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ocr{display:flex;gap:5px;margin-top:2px;justify-content:center;align-items:center}
.ocrdigit-z,.ocrdigit-e{width:26px;height:50px;border:2.5px solid #000;border-radius:3px;background:#fff}
.ocranker{width:5mm;height:5mm;border:2.7mm solid #000;margin-right:2.5mm;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.matdigits{display:flex;gap:3px;margin-top:4px;align-items:center}
.matanker{width:5mm;height:5mm;border:2.7mm solid #000;margin-right:2.5mm;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.matdigit{width:30px;height:36px;border:2.5px solid #000;border-radius:2px;background:#fff;flex-shrink:0}
.bereich{border:1.5px solid #c8d8d2;border-top:none;border-radius:0 0 4px 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}

.hinweis{margin-top:10px;font-size:7pt;color:#bbb;text-align:center}

/* ── OCR-Eckmarker: ArUco-Marker (DICT_4X4_50, IDs 0..3 = TL,TR,BL,BR) zum Entzerren
   der Seite per Homographie. 10mm, 5mm vom Rand (Quiet Zone + kein Drucker-Beschnitt).
   image-rendering:pixelated → scharfe Kanten, der Drucker blurrt das Muster nicht. ── */
.ocreck{position:fixed;width:10mm;height:10mm;image-rendering:pixelated;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ocreck-tl{top:5mm;left:5mm}
.ocreck-tr{top:5mm;right:5mm}
.ocreck-bl{bottom:16mm;left:5mm}
.ocreck-br{bottom:16mm;right:5mm}
</style>
</head><body>
<img class="ocreck ocreck-tl" src="${ARUCO_MARKERS[0]}">
<img class="ocreck ocreck-tr" src="${ARUCO_MARKERS[1]}">
<img class="ocreck ocreck-bl" src="${ARUCO_MARKERS[2]}">
<img class="ocreck ocreck-br" src="${ARUCO_MARKERS[3]}">
<table class="outer">
<thead class="rh"><tr><td>
  <div class="hbox">
    <div class="hd">
      <span class="htitle">${esc(klausurName)}</span>
      <div class="hmeta">
        ${datumStr ? `<span>Datum: <strong>${datumStr}</strong></span>` : ""}
        <span>Gesamt: <strong>${gesamtMax} Pkt.</strong></span>
      </div>
    </div>
    <div class="studi">
      <div><div class="slabel">Name, Vorname</div><div class="sline"></div></div>
      <div><div class="slabel">Matrikelnummer</div><div class="matdigits"><div class="matanker"></div>${"<div class=\"matdigit\"></div>".repeat(8)}</div></div>
    </div>
  </div>
</td></tr></thead>
<tbody>
<tr><td>${aufgabenHTML}</td></tr>
<tr><td>
  <p class="hinweis">Punkte deutlich in die Felder eintragen · wird per Scan ausgewertet</p>
</td></tr>
</tbody>
<tfoot class="rf"><tr><td></td></tr></tfoot>
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

              {/* Notenschlüssel */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Notenschlüssel</label>
                <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "0.875rem", color: "#333" }}>
                    <input
                      type="radio"
                      name="notenschluessel-typ"
                      checked={istStandardNotenschluessel}
                      onChange={() => setIstStandardNotenschluessel(true)}
                      disabled={loading}
                    />
                    Standard
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "0.875rem", color: "#333" }}>
                    <input
                      type="radio"
                      name="notenschluessel-typ"
                      checked={!istStandardNotenschluessel}
                      onChange={() => setIstStandardNotenschluessel(false)}
                      disabled={loading}
                    />
                    Andere
                  </label>
                </div>
                {istStandardNotenschluessel ? (
                  <p style={{ fontSize: "0.78rem", color: "#999", margin: 0 }}>
                    1,0 ab 95% · 4,0 ab 50% · 5,0 unter 50%
                  </p>
                ) : (
                  <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {notenschluessel.map((eintrag, i) => (
                      <div key={eintrag.note} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          backgroundColor: eintrag.color,
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                          minWidth: "34px",
                          textAlign: "center",
                          flexShrink: 0,
                        }}>
                          {eintrag.note}
                        </span>
                        {eintrag.note === "5,0" ? (
                          <span style={{ fontSize: "0.82rem", color: "#aaa" }}>unter Bestehensgrenze (fest)</span>
                        ) : (
                          <>
                            <span style={{ fontSize: "0.82rem", color: "#666" }}>ab</span>
                            <input
                              type="number"
                              value={eintrag.schwelle}
                              onChange={(e) => schwelleAendern(i, e.target.value)}
                              min="1"
                              max="100"
                              disabled={loading}
                              style={{ ...inputStyle, width: "70px", textAlign: "center", padding: "6px 8px" }}
                            />
                            <span style={{ fontSize: "0.82rem", color: "#666" }}>%</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
            <div ref={printRef} style={{ ...templateContainerStyle, overflowX: "auto", position: "relative" }}>
              {/* OCR-Eckmarker (Vorschau) – ArUco wie im Druck (IDs 0..3 = TL,TR,BL,BR) */}
              {[
                { top:4, left:4 },
                { top:4, right:4 },
                { bottom:4, left:4 },
                { bottom:4, right:4 },
              ].map((pos, i) => (
                <img key={i} src={ARUCO_MARKERS[i]} alt="" style={{ position:"absolute", width:22, height:22, imageRendering:"pixelated", ...pos }} />
              ))}
              {/*
                Wrapper-Tabelle: <thead> wiederholt sich auf jeder Druckseite automatisch.
                Jede Aufgabe ist eine eigene <tr> mit break-inside:avoid.
              */}
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>

                {/* ── Wiederholender Kopf ── */}
                <thead>
                  <tr>
                    <td style={{ paddingBottom: "12px" }}>
                      {/* Kopfzeile + Name/Matrikel – wiederholt sich auf jeder Druckseite via thead */}
                      <div style={{ border: "1.5px solid #2d5a4b", borderRadius: "5px", padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #c8d8d2", paddingBottom: "8px", marginBottom: "8px" }}>
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
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
                          <div>
                            <span style={templateLabelStyle}>Name, Vorname</span>
                            <div style={ausfuellFeldStyle} />
                          </div>
                          <div>
                            <span style={templateLabelStyle}>Matrikelnummer</span>
                            <div style={{ display:"flex", gap:"2px", marginTop:"4px", alignItems:"center" }}>
                              <div style={{ width:"9px", height:"9px", backgroundColor:"#000", marginRight:"3px", flexShrink:0 }} />
                              {Array.from({length:8}).map((_,k) => (
                                <div key={k} style={{ width:"16px", height:"26px", border:"2px solid #000", borderRadius:"2px", backgroundColor:"#fff", flexShrink:0 }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </thead>

                <tbody>

                  {/* ── Eine Aufgabe pro Zeile ── */}
                  {aufgaben.map((aufgabe, i) => (
                    <tr key={i}>
                      <td style={{ paddingBottom: "14px", pageBreakInside: "avoid", breakInside: "avoid" }}>
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
                            borderLeft: "4px solid #000", padding: "8px 12px",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: "5px", minWidth: "110px",
                          }}>
                            <span style={{ fontSize: "0.68rem", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>Max. Punkte</span>
                            <span style={{ fontSize: "1rem", fontWeight: "700", color: "#2d5a4b" }}>{aufgabe.maxPunkte}</span>
                            <span style={{ fontSize: "0.68rem", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "4px" }}>Erreicht</span>
                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                              <div style={{ width:"10px", height:"10px", backgroundColor:"#000", marginRight:"4px", flexShrink:0 }} />
                              <div style={{ width: "22px", height: "38px", border: "2px solid #000", borderRadius: "3px", backgroundColor: "#fff" }} />
                              <div style={{ width: "22px", height: "38px", border: "2px solid #000", borderRadius: "3px", backgroundColor: "#fff" }} />
                            </div>
                          </div>
                        </div>
                        {/* Bearbeitungsraum */}
                        <BearbeitungsRaum typ={aufgabe.papierTyp} hoehe={BEARBEITUNGSRAUM_HOEHEN[aufgabe.raumGroesse]} />
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td>
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
