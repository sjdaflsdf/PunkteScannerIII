import { useState } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function UploadModal({ onClose }) {
  const [dateien, setDateien] = useState([]); // Array von { file, vorschau }
  const [dragOver, setDragOver] = useState(false);
  const { isMobile } = useBreakpoint();

  function dateienHinzufuegen(files) {
    const neu = Array.from(files).map((file) => ({
      file,
      vorschau: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setDateien((prev) => [...prev, ...neu]);
  }

  function handleDateiWahl(e) {
    if (e.target.files.length) dateienHinzufuegen(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) dateienHinzufuegen(e.dataTransfer.files);
  }

  function dateiEntfernen(index) {
    setDateien((prev) => {
      if (prev[index].vorschau) URL.revokeObjectURL(prev[index].vorschau);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!dateien.length) {
      alert("Bitte zuerst eine Datei auswählen.");
      return;
    }
<<<<<<< HEAD
    console.log("Upload:", dateien.map((d) => d.file.name));
=======
    console.log("Upload:", datei.name);
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
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
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div style={{
        backgroundColor: "white",
<<<<<<< HEAD
        borderRadius: "16px",
        padding: "32px",
        width: "480px",
        maxWidth: "90vw",
        maxHeight: "90vh",
        overflowY: "auto",
=======
        borderRadius: isMobile ? "16px 16px 0 0" : "16px",
        padding: isMobile ? "24px 20px" : "32px",
        width: isMobile ? "100%" : "480px",
        maxWidth: isMobile ? "100%" : "90vw",
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {isMobile && (
          <div style={{
            width: "40px",
            height: "4px",
            backgroundColor: "#d0d0d0",
            borderRadius: "2px",
            margin: "0 auto 20px",
          }} />
        )}

        <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Neue Prüfung hochladen</h2>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "24px" }}>
          PDF oder Foto hochladen, um die automatische Auswertung zu starten.
        </p>

        <form onSubmit={handleSubmit}>

          {/* ── Drag & Drop Bereich ── */}
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
<<<<<<< HEAD
              padding: "28px",
=======
              padding: isMobile ? "24px 16px" : "32px",
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
              cursor: "pointer",
              backgroundColor: dragOver ? "#f0f7f4" : "#fafafa",
              marginBottom: "12px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📄</span>
<<<<<<< HEAD
            <span style={{ fontSize: "0.875rem", color: "#555", fontWeight: "500" }}>
              Datei hierher ziehen oder klicken
=======
            <span style={{ fontSize: "0.875rem", color: "#555", fontWeight: "500", textAlign: "center" }}>
              {datei ? datei.name : isMobile ? "Tippen zum Auswählen" : "Datei hierher ziehen oder klicken"}
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
            </span>
            <span style={{ fontSize: "0.78rem", color: "#aaa" }}>PDF, JPG, PNG – mehrere möglich</span>
            <input
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={handleDateiWahl}
              style={{ display: "none" }}
            />
          </label>

<<<<<<< HEAD
          {/* ── Kamera-Button (Handy) ── */}
          <label style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            border: "1px solid #d0d0d0",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "#fafafa",
            fontSize: "0.875rem",
            color: "#555",
            fontWeight: "500",
            boxSizing: "border-box",
          }}>
            📷 Foto mit Kamera aufnehmen
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleDateiWahl}
              style={{ display: "none" }}
            />
          </label>

          {/* ── Miniaturansicht ── */}
          {dateien.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{
                fontSize: "0.78rem",
                color: "#888",
                marginBottom: "8px",
                fontWeight: "500",
              }}>
                {dateien.length} Datei{dateien.length > 1 ? "en" : ""} ausgewählt
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "8px",
              }}>
                {dateien.map((d, i) => (
                  <div key={i} style={{ position: "relative" }}>

                    {/* Bild-Vorschau */}
                    {d.vorschau ? (
                      <img
                        src={d.vorschau}
                        alt={d.file.name}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "0.5px solid #E0DED8",
                          display: "block",
                        }}
                      />
                    ) : (
                      /* PDF-Kachel */
                      <div style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: "8px",
                        border: "0.5px solid #E0DED8",
                        background: "#F8F7F5",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        padding: "6px",
                        boxSizing: "border-box",
                      }}>
                        <span style={{ fontSize: "22px" }}>📄</span>
                        <span style={{
                          fontSize: "9px",
                          color: "#888",
                          textAlign: "center",
                          wordBreak: "break-all",
                          lineHeight: "1.3",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {d.file.name}
                        </span>
                      </div>
                    )}

                    {/* Entfernen-Button */}
                    <button
                      type="button"
                      onClick={() => dateiEntfernen(i)}
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: "3px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "9px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>

                    {/* Dateiname unter Bild */}
                    {d.vorschau && (
                      <div style={{
                        fontSize: "9px",
                        color: "#888",
                        textAlign: "center",
                        marginTop: "3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {d.file.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Buttons ── */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
=======
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "10px",
            justifyContent: "flex-end",
          }}>
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #d0d0d0",
                background: "white",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#555",
                fontSize: "0.875rem",
                order: isMobile ? 2 : 0,
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={dateien.length === 0}
              style={{
                backgroundColor: dateien.length ? "#2d5a4b" : "#a0b8b2",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: dateien.length ? "pointer" : "not-allowed",
                fontWeight: "500",
<<<<<<< HEAD
                transition: "background 0.15s",
=======
                fontSize: "0.875rem",
                order: isMobile ? 1 : 0,
>>>>>>> 2ac4409 (MobileVersion hinzugefügt)
              }}
            >
              {dateien.length > 1
                ? `${dateien.length} Dateien auswerten`
                : "Hochladen & Auswerten"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
