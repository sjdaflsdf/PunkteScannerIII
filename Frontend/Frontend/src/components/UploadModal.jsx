import { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function UploadModal({ onClose, onErgebnis }) {
  const [schritt, setSchritt] = useState(1); // 1 = Prüfung wählen, 2 = Seiten hochladen, 3 = Ergebnis prüfen
  const [pruefungen, setPruefungen] = useState([]);
  const [loadingPruefungen, setLoadingPruefungen] = useState(true);
  const [selectedPruefungId, setSelectedPruefungId] = useState(null);
  const [dateien, setDateien] = useState([]); // [{ id, file, preview }]
  const [dragOver, setDragOver] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ocrErgebnis, setOcrErgebnis] = useState(null); // { matrikelnummer, aufgaben: [{...}] }
  const [matrikelnummer, setMatrikelnummer] = useState("");
  const [erreichterPunkte, setErreichterPunkte] = useState([]); // editierbare Punkte-Liste
  const [saving, setSaving] = useState(false);
  const [studentDialog, setStudentDialog] = useState(null); // { matNr, name }
  const [studentName, setStudentName] = useState("");

  const fileInputRef = useRef(null);
  const kameraInputRef = useRef(null);

  useEffect(() => {
    api.getPruefungen()
      .then((data) => {
        setPruefungen(data);
        if (data.length > 0) setSelectedPruefungId(data[0].id);
      })
      .catch((e) => setFehler(e.message))
      .finally(() => setLoadingPruefungen(false));
  }, []);

  function dateienHinzufuegen(files) {
    const neu = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type === "application/pdf")
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }));
    setDateien((prev) => [...prev, ...neu]);
    setFehler(null);
  }

  function dateiEntfernen(id) {
    setDateien((prev) => {
      const entfernt = prev.find((d) => d.id === id);
      if (entfernt?.preview) URL.revokeObjectURL(entfernt.preview);
      return prev.filter((d) => d.id !== id);
    });
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    dateienHinzufuegen(e.dataTransfer.files);
  }

  function weiter() {
    if (!selectedPruefungId) {
      setFehler("Bitte eine Prüfung auswählen.");
      return;
    }
    setFehler(null);
    setSchritt(2);
  }

  async function handleScannen() {
    if (dateien.length === 0) {
      setFehler("Bitte mindestens eine Seite hochladen.");
      return;
    }
    setFehler(null);
    setScanning(true);
    try {
      const result = await api.ocrScan(selectedPruefungId, dateien);
      setOcrErgebnis(result);
      setMatrikelnummer(result.matrikelnummer ?? "");
      setErreichterPunkte(result.aufgaben.map((a) => a.erreichterPunkte ?? ""));
      setSchritt(3);
    } catch (err) {
      setFehler(err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleBestaetigen() {
    for (const [i, p] of erreichterPunkte.entries()) {
      if (p === "" || p === null) {
        setFehler(`Aufgabe ${i + 1}: Punkte fehlen oder konnten nicht erkannt werden.`);
        return;
      }
    }
    if (!matrikelnummer.trim()) {
      setFehler("Matrikelnummer fehlt oder konnte nicht erkannt werden.");
      return;
    }
    setFehler(null);
    setSaving(true);
    try {
      // Erst prüfen ob Student in DB vorhanden
      await api.studentSuchen(matrikelnummer.trim());
      // Gefunden → direkt auswerten
      await speichernUndAbschliessen();
    } catch (err) {
      if (err.message?.includes("404") || err.message?.includes("nicht gefunden")) {
        // Student nicht in DB → Dialog zeigen
        setSaving(false);
        setStudentDialog({ matNr: matrikelnummer.trim() });
        setStudentName("");
      } else {
        setFehler(err.message);
        setSaving(false);
      }
    }
  }

  async function handleStudentAnlegenUndSpeichern() {
    setSaving(true);
    setFehler(null);
    try {
      await api.studentAnlegen(studentDialog.matNr, studentName);
      setStudentDialog(null);
      await speichernUndAbschliessen();
    } catch (err) {
      setFehler(err.message);
      setSaving(false);
    }
  }

  async function speichernUndAbschliessen() {
    const result = await api.auswerten({
      pruefungId: selectedPruefungId,
      matrikelnummer: matrikelnummer.trim(),
      erreichterPunkte: erreichterPunkte.map(Number),
    });
    onErgebnis(result);
  }

  const selectedPruefung = pruefungen.find((p) => p.id === selectedPruefungId);

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
        width: "580px",
        maxWidth: "95vw",
        maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "4px" }}>Klausur auswerten</h2>
            <p style={{ color: "#999", fontSize: "0.82rem" }}>
              Schritt {schritt} von 3 — {schritt === 1 ? "Prüfung auswählen" : schritt === 2 ? "Seiten hochladen" : "Ergebnis prüfen"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.4rem", color: "#aaa", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}
          >
            ×
          </button>
        </div>

        {/* Schritt-Indikatoren */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                backgroundColor: s <= schritt ? "#2d5a4b" : "#e8e8e8",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* ── Schritt 1: Prüfung wählen ── */}
        {schritt === 1 && (
          <div>
            <label style={labelStyle}>Prüfung auswählen</label>

            {loadingPruefungen && (
              <p style={{ color: "#999", fontSize: "0.875rem" }}>Lade Prüfungen…</p>
            )}

            {!loadingPruefungen && pruefungen.length === 0 && (
              <div style={hinweisBoxStyle}>
                Keine Prüfungen gefunden. Lege zuerst eine Prüfung an.
              </div>
            )}

            {!loadingPruefungen && pruefungen.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {pruefungen.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPruefungId(p.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      border: p.id === selectedPruefungId ? "2px solid #2d5a4b" : "1.5px solid #e0e0e0",
                      borderRadius: "10px",
                      background: p.id === selectedPruefungId ? "#f0f7f4" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border 0.15s, background 0.15s",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: "500", fontSize: "0.9rem", color: "#222", marginBottom: "2px" }}>{p.name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#999" }}>
                        {p.datum}
                        {p.maxPunkte != null ? ` · ${p.maxPunkte} Pkt. max` : ""}
                        {p.studierende != null ? ` · ${p.studierende} Studierende` : ""}
                      </p>
                    </div>
                    {p.id === selectedPruefungId && (
                      <span style={{ color: "#2d5a4b", fontSize: "1.1rem" }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Schritt 2: Seiten hochladen ── */}
        {schritt === 2 && (
          <div>
            {selectedPruefung && (
              <div style={{ backgroundColor: "#f0f7f4", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "0.85rem", color: "#2d5a4b", fontWeight: "500" }}>
                {selectedPruefung.name}
                {selectedPruefung.datum ? ` · ${selectedPruefung.datum}` : ""}
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? "#2d5a4b" : "#d0d0d0"}`,
                borderRadius: "12px",
                padding: "32px 20px",
                textAlign: "center",
                backgroundColor: dragOver ? "#f0f7f4" : "#fafafa",
                transition: "all 0.15s",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📄</div>
              <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "6px", fontWeight: "500" }}>
                Seiten hierher ziehen
              </p>
              <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "16px" }}>
                JPG, PNG oder PDF · mehrere Dateien möglich
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                {/* Datei hochladen */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => dateienHinzufuegen(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={uploadBtnStyle}
                >
                  Datei wählen
                </button>

                {/* Kamera (mobil: öffnet direkt die Kamera) */}
                <input
                  ref={kameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => dateienHinzufuegen(e.target.files)}
                />
                <button
                  onClick={() => kameraInputRef.current?.click()}
                  style={{ ...uploadBtnStyle, backgroundColor: "#2d5a4b", color: "white", border: "none" }}
                >
                  📷 Kamera
                </button>
              </div>
            </div>

            {/* Vorschau der hochgeladenen Seiten */}
            {dateien.length > 0 && (
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  {dateien.length} {dateien.length === 1 ? "Seite" : "Seiten"} hochgeladen
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}>
                  {dateien.map((d, i) => (
                    <div
                      key={d.id}
                      style={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #e8e8e8",
                        backgroundColor: "#f5f5f5",
                        aspectRatio: "3/4",
                      }}
                    >
                      {d.preview ? (
                        <img
                          src={d.preview}
                          alt={`Seite ${i + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
                          <span style={{ fontSize: "1.8rem" }}>📄</span>
                          <span style={{ fontSize: "0.7rem", marginTop: "4px" }}>PDF</span>
                        </div>
                      )}

                      {/* Seitennummer */}
                      <div style={{
                        position: "absolute",
                        bottom: "4px",
                        left: "4px",
                        backgroundColor: "rgba(0,0,0,0.55)",
                        color: "white",
                        fontSize: "0.65rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                      }}>
                        {i + 1}
                      </div>

                      {/* Entfernen-Button */}
                      <button
                        onClick={() => dateiEntfernen(d.id)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          backgroundColor: "rgba(0,0,0,0.55)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialog: Student nicht gefunden */}
        {studentDialog && (
          <div style={{
            border: "1.5px solid #f0a030",
            borderRadius: "10px",
            padding: "16px 18px",
            backgroundColor: "#fffbf0",
            marginTop: "16px",
          }}>
            <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#7a4f00", marginBottom: "6px" }}>
              Student nicht gefunden
            </p>
            <p style={{ fontSize: "0.82rem", color: "#8a6000", marginBottom: "14px" }}>
              Matrikelnummer <strong>{studentDialog.matNr}</strong> ist nicht in der Datenbank.
              Soll dieser Student jetzt angelegt werden?
            </p>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ ...labelStyle, color: "#7a4f00" }}>Name (optional)</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="z. B. Max Mustermann"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setStudentDialog(null)}
                style={sekundaerBtnStyle}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleStudentAnlegenUndSpeichern}
                disabled={saving}
                style={{ ...primaerBtnStyle, backgroundColor: "#b86800" }}
              >
                {saving ? "Wird angelegt…" : "Student anlegen & speichern"}
              </button>
            </div>
          </div>
        )}

        {/* Fehler */}
        {fehler && (
          <div style={fehlerBoxStyle}>{fehler}</div>
        )}

        {/* ── Schritt 3: OCR-Ergebnis prüfen ── */}
        {schritt === 3 && ocrErgebnis && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Matrikelnummer</label>
              <input
                type="text"
                value={matrikelnummer}
                onChange={(e) => setMatrikelnummer(e.target.value)}
                placeholder="z. B. 12345678"
                style={inputStyle}
              />
              {!matrikelnummer && (
                <p style={{ color: "#e57373", fontSize: "0.78rem", marginTop: "4px" }}>
                  Nicht erkannt — bitte manuell eintragen.
                </p>
              )}
            </div>

            <label style={labelStyle}>Erreichte Punkte je Aufgabe</label>
            <div style={{ border: "1px solid #e8e8e8", borderRadius: "10px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={tableThStyle}>Nr.</th>
                    <th style={tableThStyle}>Aufgabe</th>
                    <th style={{ ...tableThStyle, textAlign: "center" }}>Erreicht</th>
                    <th style={{ ...tableThStyle, textAlign: "center" }}>Max.</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrErgebnis.aufgaben.map((aufgabe, i) => (
                    <tr key={aufgabe.aufgabeNr} style={{ borderTop: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#888", width: "36px" }}>
                        {aufgabe.aufgabeNr}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#333" }}>
                        {aufgabe.bezeichnung}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", width: "90px" }}>
                        <input
                          type="number"
                          min="0"
                          max={aufgabe.maxPunkte}
                          value={erreichterPunkte[i] ?? ""}
                          onChange={(e) => setErreichterPunkte((prev) => {
                            const neu = [...prev];
                            neu[i] = e.target.value;
                            return neu;
                          })}
                          style={{
                            ...inputStyle,
                            textAlign: "center",
                            padding: "6px 8px",
                            width: "70px",
                            border: (erreichterPunkte[i] === "" || erreichterPunkte[i] === null)
                              ? "1.5px solid #e57373"
                              : "1px solid #e0e0e0",
                          }}
                        />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.85rem", color: "#999", width: "60px" }}>
                        {aufgabe.maxPunkte}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "8px" }}>
              Rot markierte Felder wurden nicht erkannt — bitte manuell korrigieren.
            </p>
          </div>
        )}

        {/* Footer-Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "28px" }}>
          {schritt === 1 ? (
            <>
              <button onClick={onClose} style={sekundaerBtnStyle}>Abbrechen</button>
              <button
                onClick={weiter}
                disabled={!selectedPruefungId || loadingPruefungen}
                style={{ ...primaerBtnStyle, opacity: (!selectedPruefungId || loadingPruefungen) ? 0.5 : 1 }}
              >
                Weiter →
              </button>
            </>
          ) : schritt === 2 ? (
            <>
              <button onClick={() => setSchritt(1)} style={sekundaerBtnStyle} disabled={scanning}>← Zurück</button>
              <button
                onClick={handleScannen}
                disabled={dateien.length === 0 || scanning}
                style={{ ...primaerBtnStyle, opacity: (dateien.length === 0 || scanning) ? 0.5 : 1 }}
              >
                {scanning ? "Scanne…" : "Scannen & erkennen"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setSchritt(2)} style={sekundaerBtnStyle} disabled={saving}>← Zurück</button>
              <button
                onClick={handleBestaetigen}
                disabled={saving}
                style={{ ...primaerBtnStyle, opacity: saving ? 0.5 : 1 }}
              >
                {saving ? "Speichern…" : "Bestätigen & Speichern"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: "600",
  color: "#555",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const uploadBtnStyle = {
  backgroundColor: "white",
  color: "#2d5a4b",
  border: "1.5px solid #2d5a4b",
  borderRadius: "8px",
  padding: "8px 18px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: "500",
};

const primaerBtnStyle = {
  backgroundColor: "#2d5a4b",
  color: "white",
  border: "none",
  padding: "9px 22px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.875rem",
};

const sekundaerBtnStyle = {
  border: "1px solid #d0d0d0",
  background: "white",
  padding: "9px 22px",
  borderRadius: "8px",
  cursor: "pointer",
  color: "#555",
  fontSize: "0.875rem",
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

const hinweisBoxStyle = {
  backgroundColor: "#fafafa",
  border: "1px solid #e8e8e8",
  borderRadius: "8px",
  padding: "16px",
  color: "#888",
  fontSize: "0.85rem",
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

const tableThStyle = {
  padding: "8px 12px",
  fontSize: "0.75rem",
  fontWeight: "600",
  color: "#888",
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
