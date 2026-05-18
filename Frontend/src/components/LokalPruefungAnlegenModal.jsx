import { useState } from "react";

const LEERE_AUFGABE = { bezeichnung: "", maxPunkte: "" };

const NOTEN_TEMPLATE = [
  { note: "1,0", color: "#4CAF50" },
  { note: "1,3", color: "#4CAF50" },
  { note: "1,7", color: "#66BB6A" },
  { note: "2,0", color: "#8BC34A" },
  { note: "2,3", color: "#8BC34A" },
  { note: "2,7", color: "#AED581" },
  { note: "3,0", color: "#FF9800" },
  { note: "3,3", color: "#FF9800" },
  { note: "3,7", color: "#FFA726" },
  { note: "4,0", color: "#F44336" },
];

function berechneNotenschluessel(bestandenAb) {
  const rangePerGrade = (100 - bestandenAb) / NOTEN_TEMPLATE.length;
  const schluessel = NOTEN_TEMPLATE.map((n, i) => ({
    ...n,
    schwelle: Math.round(bestandenAb + (NOTEN_TEMPLATE.length - 1 - i) * rangePerGrade),
  }));
  schluessel.push({ note: "5,0", schwelle: 0, color: "#B71C1C" });
  return schluessel;
}

export default function LokalPruefungAnlegenModal({ onClose, onAngelegt }) {
  const [klausurName, setKlausurName] = useState("");
  const [datum, setDatum] = useState("");
  const [aufgaben, setAufgaben] = useState([{ ...LEERE_AUFGABE }]);
  const [fehler, setFehler] = useState(null);
  const [istStandardNotenschluessel, setIstStandardNotenschluessel] = useState(true);
  const [bestandenAb, setBestandenAb] = useState(50);

  function aufgabeAendern(index, feld, wert) {
    setAufgaben((prev) => prev.map((a, i) => (i === index ? { ...a, [feld]: wert } : a)));
  }

  function aufgabeHinzufuegen() {
    setAufgaben((prev) => [...prev, { ...LEERE_AUFGABE }]);
  }

  function aufgabeEntfernen(index) {
    if (aufgaben.length === 1) return;
    setAufgaben((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAnlegen(e) {
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

    const pruefung = {
      id: "lokal_" + Date.now(),
      name: klausurName.trim(),
      datum: datum || null,
      status: "in_bearbeitung",
      lokal: true,
      aufgaben: aufgaben.map((a, i) => ({
        id: i,
        bezeichnung: a.bezeichnung.trim(),
        maxPunkte: Number(a.maxPunkte),
      })),
      ergebnisse: [],
      istStandardNotenschluessel,
      notenschluessel: istStandardNotenschluessel ? null : berechneNotenschluessel(bestandenAb),
    };

    const vorhandene = JSON.parse(localStorage.getItem("pruefungen_lokal") || "[]");
    localStorage.setItem("pruefungen_lokal", JSON.stringify([...vorhandene, pruefung]));
    onAngelegt(pruefung);
  }

  const gesamtMax = aufgaben.reduce((s, a) => s + (Number(a.maxPunkte) || 0), 0);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div style={modalStyle}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Prüfung lokal anlegen</h2>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
          Ohne Server – Ergebnisse werden im Browser gespeichert.
        </p>

        <form onSubmit={handleAnlegen}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Klausurtitel</label>
            <input
              type="text"
              value={klausurName}
              onChange={(e) => setKlausurName(e.target.value)}
              placeholder="z. B. Datenbanken II – Klausur SS 2026"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Datum (optional)</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
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
                  name="notenschluessel-typ-lokal"
                  checked={istStandardNotenschluessel}
                  onChange={() => setIstStandardNotenschluessel(true)}
                />
                Standard
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "0.875rem", color: "#333" }}>
                <input
                  type="radio"
                  name="notenschluessel-typ-lokal"
                  checked={!istStandardNotenschluessel}
                  onChange={() => setIstStandardNotenschluessel(false)}
                />
                Andere
              </label>
            </div>
            {istStandardNotenschluessel ? (
              <p style={{ fontSize: "0.78rem", color: "#999", margin: 0 }}>
                1,0 ab 95% · 4,0 ab 50% · 5,0 unter 50%
              </p>
            ) : (
              <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.875rem", color: "#555" }}>Note 4,0 (bestanden) ab</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={bestandenAb}
                    onChange={(e) => setBestandenAb(Number(e.target.value))}
                    style={{ ...inputStyle, width: "68px", textAlign: "center", padding: "6px 8px" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "#555" }}>%</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#999", margin: "8px 0 0" }}>
                  Die anderen Noten werden gleichmäßig verteilt · 1,0 ab {berechneNotenschluessel(bestandenAb)[0].schwelle}%
                </p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={labelStyle}>Aufgaben</label>
              <span style={{ fontSize: "0.75rem", color: "#999" }}>Bezeichnung · Max. Punkte</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {aufgaben.map((aufgabe, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: "600", paddingTop: "10px", minWidth: "22px" }}>
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={aufgabe.bezeichnung}
                    onChange={(e) => aufgabeAendern(i, "bezeichnung", e.target.value)}
                    placeholder={`Aufgabe ${i + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="number"
                      value={aufgabe.maxPunkte}
                      onChange={(e) => aufgabeAendern(i, "maxPunkte", e.target.value)}
                      placeholder="10"
                      min="1"
                      style={{ ...inputStyle, width: "68px", textAlign: "center" }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#aaa", whiteSpace: "nowrap" }}>Pkt.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => aufgabeEntfernen(i)}
                    disabled={aufgaben.length === 1}
                    style={{
                      background: "none", border: "none",
                      color: aufgaben.length === 1 ? "#ccc" : "#e57373",
                      cursor: aufgaben.length === 1 ? "default" : "pointer",
                      fontSize: "1.2rem", padding: "6px 4px", flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={aufgabeHinzufuegen}
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
            <button type="button" onClick={onClose} style={sekundaerBtnStyle}>
              Abbrechen
            </button>
            <button type="submit" style={primaerBtnStyle}>
              Anlegen & Ergebnisse eingeben
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "32px",
  width: "560px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
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
