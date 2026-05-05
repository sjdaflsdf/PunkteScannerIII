import { useState } from "react";
import { api } from "../api";

export default function NeuePruefungModal({ onClose, onErfolgreich }) {
  const [name, setName] = useState("");
  const [datum, setDatum] = useState("");
  const [status, setStatus] = useState("entwurf");
  const [aufgaben, setAufgaben] = useState([{ maxPunkte: "" }]);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);

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
