import { useState } from "react";
import { api } from "../api";

const LEERE_AUFGABE = { name: "", punkte: "", maxPunkte: "" };

export default function UploadModal({ onClose, onErgebnis }) {
  const [pruefungName, setPruefungName] = useState("");
  const [aufgaben, setAufgaben] = useState([{ ...LEERE_AUFGABE }]);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState(null);

  function aufgabeAendern(index, feld, wert) {
    setAufgaben((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [feld]: wert } : a))
    );
  }

  function aufgabeHinzufuegen() {
    setAufgaben((prev) => [...prev, { ...LEERE_AUFGABE }]);
  }

  function aufgabeEntfernen(index) {
    setAufgaben((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFehler(null);

    if (!pruefungName.trim()) {
      setFehler("Bitte einen Prüfungsnamen eingeben.");
      return;
    }
    if (aufgaben.length === 0) {
      setFehler("Mindestens eine Aufgabe erforderlich.");
      return;
    }
    for (const [i, a] of aufgaben.entries()) {
      if (!a.name.trim()) {
        setFehler(`Aufgabe ${i + 1}: Name fehlt.`);
        return;
      }
      if (a.punkte === "" || a.maxPunkte === "") {
        setFehler(`Aufgabe ${i + 1}: Punkte fehlen.`);
        return;
      }
      if (Number(a.punkte) > Number(a.maxPunkte)) {
        setFehler(`Aufgabe ${i + 1}: Erreichte Punkte übersteigen Maximum.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        pruefungName: pruefungName.trim(),
        aufgaben: aufgaben.map((a) => ({
          name: a.name.trim(),
          punkte: Number(a.punkte),
          maxPunkte: Number(a.maxPunkte),
        })),
      };
      const result = await api.auswerten(payload);
      onErgebnis(result);
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
        width: "520px",
        maxWidth: "95vw",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Prüfung auswerten</h2>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
          Prüfungsname und Aufgabenpunkte eingeben.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Prüfungsname */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Prüfungsname</label>
            <input
              type="text"
              value={pruefungName}
              onChange={(e) => setPruefungName(e.target.value)}
              placeholder="z. B. Datenbanken II"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Aufgaben */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={labelStyle}>Aufgaben</label>
              <span style={{ fontSize: "0.75rem", color: "#999" }}>
                Erreicht / Maximum
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {aufgaben.map((aufgabe, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    value={aufgabe.name}
                    onChange={(e) => aufgabeAendern(i, "name", e.target.value)}
                    placeholder={`Aufgabe ${i + 1}`}
                    disabled={loading}
                    style={{ ...inputStyle, flex: 2 }}
                  />
                  <input
                    type="number"
                    value={aufgabe.punkte}
                    onChange={(e) => aufgabeAendern(i, "punkte", e.target.value)}
                    placeholder="0"
                    min="0"
                    disabled={loading}
                    style={{ ...inputStyle, flex: 1, textAlign: "center" }}
                  />
                  <span style={{ color: "#ccc", flexShrink: 0 }}>/</span>
                  <input
                    type="number"
                    value={aufgabe.maxPunkte}
                    onChange={(e) => aufgabeAendern(i, "maxPunkte", e.target.value)}
                    placeholder="10"
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

          {/* Fehlerbox */}
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

          {/* Buttons */}
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
              {loading ? "Wird ausgewertet…" : "Auswerten"}
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
