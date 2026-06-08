import { useState } from "react";
import { api } from "../api";

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

export default function NeuePruefungModal({ onClose, onErfolgreich }) {
  const [name, setName] = useState("");
  const [datum, setDatum] = useState("");
  const [status, setStatus] = useState("entwurf");
  const [aufgaben, setAufgaben] = useState([{ maxPunkte: "" }]);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [zeigeNotenschluessel, setZeigeNotenschluessel] = useState(false);
  const [notenschluessel, setNotenschluessel] = useState(DEFAULT_NOTENSCHLUESSEL);

  function schwelleAendern(index, wert) {
    setNotenschluessel((prev) =>
      prev.map((n, i) => (i === index ? { ...n, schwelle: Number(wert) } : n))
    );
  }

  function aufgabeAendern(index, wert) {
    setAufgaben((prev) =>
      prev.map((a, i) => (i === index ? { maxPunkte: wert } : a))
    );
  }

  function aufgabeHinzufuegen() {
    setAufgaben((prev) => [...prev, { maxPunkte: "" }]);
  }

  function aufgabeEntfernen(index) {
    setAufgaben((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFehler(null);

    if (!name.trim()) {
      setFehler("Bitte einen Prüfungsnamen eingeben.");
      return;
    }
    if (!datum) {
      setFehler("Bitte ein Datum eingeben.");
      return;
    }
    if (aufgaben.length === 0) {
      setFehler("Mindestens eine Aufgabe erforderlich.");
      return;
    }
    for (const [i, a] of aufgaben.entries()) {
      if (!a.maxPunkte || Number(a.maxPunkte) < 1) {
        setFehler(`Aufgabe ${i + 1}: Maximalpunkte fehlen oder ungültig.`);
        return;
      }
    }

    const maxPunkte = aufgaben.reduce((s, a) => s + Number(a.maxPunkte), 0);

    setLoading(true);
    try {
      await api.createPruefung({
        name: name.trim(),
        datum,
        status,
        maxPunkte,
        aufgaben: aufgaben.map((a, i) => ({
          aufgabeNr: i + 1,
          maxPunkte: Number(a.maxPunkte),
        })),
        notenschluessel: zeigeNotenschluessel ? notenschluessel : undefined,
      });
      onErfolgreich();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "32px",
        width: "480px",
        maxWidth: "95vw",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Neue Prüfung anlegen</h2>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
          Prüfungsname, Datum und Aufgaben eingeben.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Prüfungsname</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Datenbanken II"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Datum</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              style={inputStyle}
            >
              <option value="entwurf">Entwurf</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
              <option value="abgeschlossen">Abgeschlossen</option>
            </select>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ ...labelStyle, marginBottom: "10px" }}>
              Aufgaben (Maximalpunkte je Aufgabe)
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {aufgaben.map((aufgabe, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#666", flexShrink: 0, minWidth: "76px" }}>
                    Aufgabe {i + 1}
                  </span>
                  <input
                    type="number"
                    value={aufgabe.maxPunkte}
                    onChange={(e) => aufgabeAendern(i, e.target.value)}
                    placeholder="Max. Punkte"
                    min="1"
                    disabled={loading}
                    style={{ ...inputStyle, flex: 1, textAlign: "center" }}
                  />
                  <button
                    type="button"
                    onClick={() => aufgabeEntfernen(i)}
                    disabled={aufgaben.length === 1 || loading}
                    style={{
                      background: "none",
                      border: "none",
                      color: aufgaben.length === 1 ? "#ccc" : "#e57373",
                      cursor: aufgaben.length === 1 ? "default" : "pointer",
                      fontSize: "1.1rem",
                      padding: "0 4px",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={aufgabeHinzufuegen}
              disabled={loading}
              style={{
                marginTop: "10px",
                background: "none",
                border: "1px dashed #c0c0c0",
                borderRadius: "6px",
                padding: "7px 14px",
                cursor: "pointer",
                color: "#2d5a4b",
                fontSize: "0.82rem",
                width: "100%",
              }}
            >
              + Aufgabe hinzufügen
            </button>
          </div>

          {/* Notenschlüssel anpassen */}
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setZeigeNotenschluessel((v) => !v)}
              style={{
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: "pointer",
                color: "#2d5a4b",
                fontSize: "0.82rem",
                width: "100%",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Notenschlüssel anpassen</span>
              <span>{zeigeNotenschluessel ? "▲" : "▼"}</span>
            </button>

            {zeigeNotenschluessel && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
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
                          style={{ ...inputStyle, width: "70px", textAlign: "center" }}
                        />
                        <span style={{ fontSize: "0.82rem", color: "#666" }}>%</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {fehler && (
            <div style={{
              marginTop: "16px",
              backgroundColor: "#fff3f3",
              border: "1px solid #fcc",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#c00",
              fontSize: "0.82rem",
            }}>
              {fehler}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                border: "1px solid #d0d0d0",
                background: "white",
                padding: "8px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#555",
                fontSize: "0.875rem",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#2d5a4b",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Wird gespeichert…" : "Prüfung anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
