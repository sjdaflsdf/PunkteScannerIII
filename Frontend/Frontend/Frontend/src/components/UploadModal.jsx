import { useState } from "react";

export default function UploadModal({ onClose }) {
  const [datei, setDatei] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDateiWahl(e) {
    setDatei(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setDatei(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!datei) {
      alert("Bitte zuerst eine Datei auswählen.");
      return;
    }
    // Hier später: Datei ans Backend senden
    console.log("Upload:", datei.name);
    onClose();
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
        maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Neue Prüfung hochladen</h2>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
          PDF oder Foto hochladen, um die automatische Auswertung zu starten.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              border: `2px dashed ${dragOver ? "#2d5a4b" : "#d0d0d0"}`,
              borderRadius: "10px",
              padding: "32px",
              cursor: "pointer",
              backgroundColor: dragOver ? "#f0f7f4" : "#fafafa",
              marginBottom: "16px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📄</span>
            <span style={{ fontSize: "0.875rem", color: "#555", fontWeight: "500" }}>
              {datei ? datei.name : "Datei hierher ziehen oder klicken"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#aaa" }}>PDF, JPG, PNG</span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleDateiWahl}
              style={{ display: "none" }}
            />
          </label>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #d0d0d0",
                background: "white",
                padding: "8px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#555",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: "#2d5a4b",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Hochladen & Auswerten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
