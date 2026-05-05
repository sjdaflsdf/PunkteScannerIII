const express = require("express");
const cors = require("cors");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

// Adresse vom Spring Boot Server (DB)
const DB_URL = "http://localhost:8081/api";

// ─── ENDPUNKT 1 ───────────────────────────────────────────
// Frontend fragt: "Gib mir alle Prüfungen"
// Du holst sie aus der DB und schickst sie ans Frontend
app.get("/api/pruefungen", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`);
    const data = await response.json();
    res.json(data); // geht ans Frontend
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 2 ───────────────────────────────────────────
// Frontend schickt Aufgaben → du rechnest Note aus → schickst
// Ergebnis ans Frontend UND speicherst es in der DB
app.post("/api/pruefung/auswerten", async (req, res) => {
  const { aufgaben, notenschluessel, pruefungId, studentId } = req.body;

  // 1. Note berechnen mit deiner Logik
  const ergebnis = pruefungAuswerten({
    aufgaben,
    notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL
  });

  // 2. Ergebnis in DB speichern
  try {
    await fetch(`${DB_URL}/ergebnisse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pruefung: { id: pruefungId },
        student: { id: studentId },
        gesamtPunkte: ergebnis.punkte,
        note: ergebnis.note,
      }),
    });
  } catch (err) {
    console.error("DB speichern fehlgeschlagen:", err.message);
  }

  // 3. Ergebnis ans Frontend schicken
  res.json(ergebnis);
});

// ─── ENDPUNKT 3 ───────────────────────────────────────────
// Ergebnisse einer Prüfung aus DB holen und ans Frontend schicken
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
// Notenschlüssel abrufen
app.get("/api/notenschluessel", (req, res) => {
  res.json(DEFAULT_NOTENSCHLUESSEL);
});

// ─── ENDPUNKT 5 ───────────────────────────────────────────
// Neue Prüfung anlegen (inkl. Aufgaben)
app.post("/api/pruefungen", async (req, res) => {
  const { aufgaben, ...pruefungData } = req.body;
  try {
    const pruefungRes = await fetch(`${DB_URL}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pruefungData),
    });
    if (!pruefungRes.ok) {
      const err = await pruefungRes.json().catch(() => ({}));
      return res.status(pruefungRes.status).json(err);
    }
    const pruefung = await pruefungRes.json();
    if (aufgaben && aufgaben.length > 0) {
      for (const aufgabe of aufgaben) {
        await fetch(`${DB_URL}/aufgaben`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pruefung: { id: pruefung.id },
            aufgabeNr: aufgabe.aufgabeNr,
            maxPunkte: aufgabe.maxPunkte,
          }),
        });
      }
    }
    res.status(201).json(pruefung);
  } catch (err) {
    console.error("Fehler beim Anlegen der Prüfung:", err.message);
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 5b ──────────────────────────────────────────
// Aufgaben einer Prüfung laden
app.get("/api/pruefungen/:id/aufgaben", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/aufgaben/pruefung/${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 6 ───────────────────────────────────────────
// Mehrere Studis auf einmal auswerten (für die Tabelle)
app.post("/api/pruefungen/batch", async (req, res) => {
  const { pruefungen, notenschluessel } = req.body;
  const ergebnisse = [];
  const fehler = [];

  for (const studi of pruefungen) {
    try {
      // 1. Note berechnen
      const ergebnis = pruefungAuswerten({
        aufgaben: studi.aufgaben,
        notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL,
      });

      // 2. In DB speichern
      try {
        await fetch(`${DB_URL}/ergebnisse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pruefung: { id: studi.pruefungId },
            student: { id: studi.studentId },
            gesamtPunkte: ergebnis.punkte,
            note: ergebnis.note,
          }),
        });
      } catch (err) {
        console.error("DB speichern fehlgeschlagen:", err.message);
      }

      // 3. Ans Frontend
      ergebnisse.push({
        matrikel: studi.matrikel ?? "unbekannt",
        name: studi.name ?? "unbekannt",
        aufgaben: studi.aufgaben,
        ...ergebnis,
      });
    } catch (err) {
      fehler.push({ matrikel: studi.matrikel ?? "unbekannt", fehler: err.message });
    }
  }

  res.json({ ergebnisse, fehler });
});

app.listen(3000, () => console.log("API läuft auf http://localhost:3000"));