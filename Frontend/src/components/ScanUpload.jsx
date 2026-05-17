import { useState, useRef } from "react";

export default function ScanUpload({ pruefungId, onErgebnis }) {
    const [datei, setDatei] = useState(null);
    const [vorschau, setVorschau] = useState(null);
    const [kameraAktiv, setKameraAktiv] = useState(false);
    const [laden, setLaden] = useState(false);
    const [fehler, setFehler] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Datei auswählen
    const handleDateiWahl = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setDatei(file);
        setFehler(null);

        if (file.type.startsWith("image/")) {
            setVorschau(URL.createObjectURL(file));
        } else {
            // PDF – kein Bild-Vorschau möglich
            setVorschau(null);
        }
    };

    //  Kamera öffnen
    const kameraOeffnen = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }, // Rückkamera
            });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            setKameraAktiv(true);
            setFehler(null);
        } catch (err) {
            setFehler("Kamera konnte nicht geöffnet werden.");
        }
    };

    // Foto machen
    const fotoMachen = () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
            setDatei(file);
            setVorschau(URL.createObjectURL(blob));
            kameraSchliessen();
        }, "image/jpeg");
    };

    // Kamera schließen
    const kameraSchliessen = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setKameraAktiv(false);
    };

    // Zurücksetzen
    const zuruecksetzen = () => {
        setDatei(null);
        setVorschau(null);
        setFehler(null);
        kameraSchliessen();
    };

    // Upload ans Backend
    const handleUpload = async () => {
        if (!datei) return;
        setLaden(true);
        setFehler(null);

        const formData = new FormData();
        formData.append("datei", datei);
        formData.append("pruefungId", pruefungId);

        try {
            const response = await fetch(
                "http://localhost:8081/api/scan/upload",
                { method: "POST", body: formData }
            );

            if (!response.ok) throw new Error("Upload fehlgeschlagen");

            const ergebnis = await response.json();
            onErgebnis(ergebnis); // Ergebnis an übergeordnete Seite weitergeben
        } catch (err) {
            setFehler("Fehler beim Upload: " + err.message);
        } finally {
            setLaden(false);
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.titel}>Prüfung scannen</h3>

            {/* ── Fehler anzeigen ── */}
            {fehler && <div style={styles.fehler}>{fehler}</div>}

            {/* ── Kamera Bereich ── */}
            {kameraAktiv && (
                <div style={styles.kameraBereich}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={styles.video}
                    />
                    <div style={styles.kameraButtons}>
                        <button onClick={fotoMachen} style={styles.btnGruen}>
                            📸 Foto machen
                        </button>
                        <button onClick={kameraSchliessen} style={styles.btnGrau}>
                            ✕ Schließen
                        </button>
                    </div>
                </div>
            )}

            {/* ── Vorschau ── */}
            {vorschau && (
                <div style={styles.vorschauBereich}>
                    <img src={vorschau} alt="Vorschau" style={styles.vorschauBild} />
                    <p style={styles.dateiName}>📷 {datei?.name}</p>
                </div>
            )}

            {/* ── PDF anzeigen ── */}
            {datei && !vorschau && (
                <div style={styles.pdfInfo}>
                    <span style={styles.pdfIcon}>📄</span>
                    <span>{datei.name}</span>
                </div>
            )}

            {/* ── Buttons ── */}
            {!kameraAktiv && !datei && (
                <div style={styles.buttonReihe}>
                    <button onClick={kameraOeffnen} style={styles.btnGruen}>
                        📷 Kamera öffnen
                    </button>
                    <label style={styles.btnBlau}>
                        📁 Datei hochladen
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleDateiWahl}
                            style={{ display: "none" }}
                        />
                    </label>
                </div>
            )}

            {/* ── Bestätigen oder Zurücksetzen ── */}
            {datei && !kameraAktiv && (
                <div style={styles.buttonReihe}>
                    <button
                        onClick={handleUpload}
                        disabled={laden}
                        style={styles.btnGruen}
                    >
                        {laden ? "Wird verarbeitet..." : "✓ Scannen bestätigen"}
                    </button>
                    <button onClick={zuruecksetzen} style={styles.btnGrau}>
                        ✕ Zurücksetzen
                    </button>
                </div>
            )}
        </div>
    );
}

// Styles
const styles = {
    container: {
        background: "#fff",
        border: "0.5px solid #E0DED8",
        borderRadius: "12px",
        padding: "20px",
        maxWidth: "600px",
    },
    titel: {
        fontSize: "15px",
        fontWeight: "500",
        color: "#1a1a1a",
        marginBottom: "16px",
    },
    fehler: {
        background: "#FCEBEB",
        color: "#791F1F",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "13px",
        marginBottom: "12px",
    },
    kameraBereich: {
        marginBottom: "12px",
    },
    video: {
        width: "100%",
        borderRadius: "8px",
        marginBottom: "8px",
    },
    kameraButtons: {
        display: "flex",
        gap: "8px",
    },
    vorschauBereich: {
        marginBottom: "12px",
        textAlign: "center",
    },
    vorschauBild: {
        maxWidth: "100%",
        maxHeight: "300px",
        borderRadius: "8px",
        border: "0.5px solid #E0DED8",
    },
    dateiName: {
        fontSize: "12px",
        color: "#888",
        marginTop: "6px",
    },
    pdfInfo: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        background: "#F8F7F5",
        borderRadius: "8px",
        marginBottom: "12px",
        fontSize: "13px",
        color: "#1a1a1a",
    },
    pdfIcon: {
        fontSize: "24px",
    },
    buttonReihe: {
        display: "flex",
        gap: "8px",
        marginTop: "12px",
    },
    btnGruen: {
        flex: 1,
        padding: "10px",
        background: "#0F6E56",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
    },
    btnBlau: {
        flex: 1,
        padding: "10px",
        background: "#185FA5",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
        textAlign: "center",
    },
    btnGrau: {
        flex: 1,
        padding: "10px",
        background: "#fff",
        color: "#444",
        border: "0.5px solid #D3D1C7",
        borderRadius: "8px",
        fontSize: "13px",
        cursor: "pointer",
    },
};