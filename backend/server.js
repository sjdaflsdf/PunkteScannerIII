const express = require("express");
const cors = require("cors");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

//  FIX: richtige Render URL
const DB_URL = "https://punktescanneriii.onrender.com/api";

// ─── ENDPUNKT 1 ───────────────────────────────────────────
app.get("/api/pruefungen", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 2 ───────────────────────────────────────────
app.post("/api/pruefung/auswerten", async (req, res) => {
  const { aufgaben, notenschluessel, pruefungId, studentId } = req.body;

  // 1. Note berechnen
  const ergebnis = pruefungAuswerten({
    aufgaben,
    notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL
  });

  // 2. Ergebnis in DB speichern
  try {
    const response = await fetch(`${DB_URL}/ergebnisse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pruefung: { id: pruefungId },
        student: { id: studentId },
        gesamtPunkte: ergebnis.punkte,
        note: ergebnis.note,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DB Fehler:", response.status, errorText);
    } else {
      console.log("DB speichern erfolgreich");
    }

  } catch (err) {
    console.error("DB speichern fehlgeschlagen:", err.message);
  }

  // 3. Antwort ans Frontend
  res.json(ergebnis);
});

// ─── ENDPUNKT 3 ───────────────────────────────────────────
app.get("/api/pruefungen/:id/ergebnisse", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/ergebnisse/pruefung/${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 4 ───────────────────────────────────────────
app.get("/api/notenschluessel", (req, res) => {
  res.json(DEFAULT_NOTENSCHLUESSEL);
});

// ─── ENDPUNKT 5 ───────────────────────────────────────────
app.post("/api/pruefungen/batch", async (req, res) => {
  const { pruefungen, notenschluessel } = req.body;
  const ergebnisse = [];
  const fehler = [];

  for (const studi of pruefungen) {
    try {
      const ergebnis = pruefungAuswerten({
        aufgaben: studi.aufgaben,
        notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL,
      });

      try {
        const response = await fetch(`${DB_URL}/ergebnisse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pruefung: { id: studi.pruefungId },
            student: { id: studi.studentId },
            gesamtPunkte: ergebnis.punkte,
            note: ergebnis.note,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("DB Fehler (Batch):", response.status, errorText);
        } else {
          console.log("DB speichern erfolgreich (Batch)");
        }

      } catch (err) {
        console.error("DB speichern fehlgeschlagen:", err.message);
      }

      ergebnisse.push({
        matrikel: studi.matrikel ?? "unbekannt",
        name: studi.name ?? "unbekannt",
        aufgaben: studi.aufgaben,
        ...ergebnis,
      });

    } catch (err) {
      fehler.push({
        matrikel: studi.matrikel ?? "unbekannt",
        fehler: err.message
      });
    }
  }

  res.json({ ergebnisse, fehler });
});

app.listen(3000, () => console.log("API läuft auf http://localhost:3000"));