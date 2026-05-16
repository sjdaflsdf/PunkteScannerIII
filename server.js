require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Hilfsfunktion: DB-Antwort parsen — auch bei leerem Body (z.B. 404 ohne JSON)
async function parseDbResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Adresse vom Spring Boot Server (DB)
const DB_URL = "https://punktescanneriii.onrender.com/api";

// ─── HEALTHCHECKS ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "punkte-scanner-api" });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`);
    if (!response.ok) {
      return res.status(502).json({ status: "error", db: "unreachable", code: response.status });
    }

    return res.json({ status: "ok", db: "reachable" });
  } catch (_err) {
    return res.status(502).json({ status: "error", db: "unreachable" });
  }
});

// ─── ENDPUNKT 1 ───────────────────────────────────────────
// Frontend fragt: "Gib mir alle Prüfungen"
// Du holst sie aus der DB und schickst sie ans Frontend
app.get("/api/pruefungen", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`);
    const data = await parseDbResponse(response);
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
  let ergebnis;
  try {
    ergebnis = pruefungAuswerten({
      aufgaben,
      notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL
    });
  } catch (err) {
    return res.status(400).json({ fehler: err.message });
  }

  // 2. Ergebnis in DB speichern
  let dbGespeichert = false;
  let dbStatusCode = null;
  let dbFehler = null;

  try {
    const dbResponse = await fetch(`${DB_URL}/ergebnisse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pruefung: { id: pruefungId },
        student: { id: studentId },
        gesamtPunkte: ergebnis.punkte,
        note: ergebnis.note,
      }),
    });
    dbStatusCode = dbResponse.status;
    dbGespeichert = dbResponse.ok;

    if (!dbResponse.ok) {
      dbFehler = await dbResponse.text();
    }
  } catch (err) {
    console.error("DB speichern fehlgeschlagen:", err.message);
    dbFehler = err.message;
  }

  // 3. Ergebnis ans Frontend schicken
  res.json({
    ...ergebnis,
    dbGespeichert,
    dbStatusCode,
    dbFehler,
  });
});

// ─── ENDPUNKT 3 ───────────────────────────────────────────
// Ergebnisse einer Prüfung aus DB holen und ans Frontend schicken
app.get("/api/pruefungen/:id/ergebnisse", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/ergebnisse/pruefung/${req.params.id}`);
    const data = await parseDbResponse(response);
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

// ─── ENDPUNKT 6 ───────────────────────────────────────────
// Neue Prüfung anlegen
app.post("/api/pruefungen", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 7 ───────────────────────────────────────────
// Prüfung anlegen (alias)
app.post("/api/pruefungen/anlegen", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 8 ───────────────────────────────────────────
// Aufgaben einer Prüfung abrufen
app.get("/api/pruefungen/:id/aufgaben", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen/${req.params.id}/aufgaben`);
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 9 ───────────────────────────────────────────
// Student per Matrikelnummer suchen
app.get("/api/studenten/matnr/:matNr", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/studenten/matnr/${encodeURIComponent(req.params.matNr)}`);
    if (response.status === 404) {
      return res.status(404).json({ message: "Student nicht gefunden" });
    }
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 10 ──────────────────────────────────────────
// Student anlegen
app.post("/api/studenten", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/studenten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── ENDPUNKT 5 ───────────────────────────────────────────
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
      let dbGespeichert = false;
      let dbStatusCode = null;

      try {
        const dbResponse = await fetch(`${DB_URL}/ergebnisse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pruefung: { id: studi.pruefungId },
            student: { id: studi.studentId },
            gesamtPunkte: ergebnis.punkte,
            note: ergebnis.note,
          }),
        });

        dbStatusCode = dbResponse.status;
        dbGespeichert = dbResponse.ok;
      } catch (err) {
        console.error("DB speichern fehlgeschlagen:", err.message);
      }

      // 3. Ans Frontend
      ergebnisse.push({
        matrikel: studi.matrikel ?? "unbekannt",
        name: studi.name ?? "unbekannt",
        aufgaben: studi.aufgaben,
        dbGespeichert,
        dbStatusCode,
        ...ergebnis,
      });
    } catch (err) {
      fehler.push({ matrikel: studi.matrikel ?? "unbekannt", fehler: err.message });
    }
  }

  res.json({ ergebnisse, fehler });
});

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
=======
// ─── ENDPUNKT 11 ──────────────────────────────────────────
// OCR: Klausurseiten scannen → Matrikelnummer + Punkte extrahieren
app.post("/api/ocr/scan", upload.array("dateien", 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ fehler: "Keine Dateien hochgeladen." });
  }

  try {
    const { createWorker } = require("tesseract.js");

    // Zwei Durchläufe: einmal für Text (Kopf), einmal Ziffern-fokussiert (Punkte)
    const workerText = await createWorker("deu");
    const workerZahlen = await createWorker("deu");
    await workerZahlen.setParameters({ tessedit_char_whitelist: "0123456789.," });

    const alleTexte = [];
    const alleZahlenTexte = [];
    for (const datei of req.files) {
      const { data: { text: t1 } } = await workerText.recognize(datei.buffer);
      const { data: { text: t2 } } = await workerZahlen.recognize(datei.buffer);
      alleTexte.push(t1);
      alleZahlenTexte.push(t2);
    }
    await workerText.terminate();
    await workerZahlen.terminate();

    const gesamtText = alleTexte.join("\n");
    const zahlenText = alleZahlenTexte.join("\n");

    // ── Matrikelnummer ──
    // Suche erst nach "Matrikelnummer" oder "Matrikel" Label, dann die nächste 7-8 stellige Zahl
    let matrikelnummer = null;
    const matrikelNachLabel = gesamtText.match(/(?:Matrikelnummer|Matrikel)[^\d]{0,20}(\d{7,8})/i);
    if (matrikelNachLabel) {
      matrikelnummer = matrikelNachLabel[1];
    } else {
      // Fallback: erste 7-8 stellige Zahl im gesamten Text
      const fallback = gesamtText.match(/\b(\d{7,8})\b/);
      if (fallback) matrikelnummer = fallback[1];
    }

    // ── Summentabelle auslesen ──
    // Template erzeugt: "Aufgabe | Max. Pkt. | Erreicht" → Zeilen "1  10  [handschrift]"
    // Strategie: Zeilen nach der Tabellenüberschrift parsen
    const aufgaben = [];

    // Primär: Summentabelle finden — nach "Aufgabe" + "Pkt" + "Erreicht" Header
    // Jede Datenzeile hat Form: <nr>  <maxPkt>  <erreichtPkt>
    const tabelleStart = gesamtText.search(/Aufgabe[\s\S]{0,40}Max[\s\S]{0,40}Erreicht/i);
    if (tabelleStart !== -1) {
      const tabellenText = gesamtText.slice(tabelleStart);
      // Zeilen mit Muster: Zahl  Zahl  Zahl (Aufgabe-Nr, Max, Erreicht)
      const zeilenRegex = /^\s*(\d+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/gm;
      let m;
      while ((m = zeilenRegex.exec(tabellenText)) !== null) {
        const nr = parseInt(m[1]);
        const maxP = parseFloat(m[2].replace(",", "."));
        const erreicht = parseFloat(m[3].replace(",", "."));
        // Gesamt-Zeile überspringen (wird separat verarbeitet)
        aufgaben.push({
          aufgabeNr: nr,
          bezeichnung: `Aufgabe ${nr}`,
          erreichterPunkte: isNaN(erreicht) ? null : erreicht,
          maxPunkte: isNaN(maxP) ? null : maxP,
        });
      }
    }

    // Fallback: "Erreicht"-Felder neben den Aufgaben-Blöcken
    // Template: "Max. Punkte\n<zahl>\nERREICHT\n<handschrift>"
    if (aufgaben.length === 0) {
      const erreichtRegex = /(?:Erreicht|ERREICHT)\s*\n\s*(\d+(?:[.,]\d+)?)/g;
      let m;
      let nr = 1;
      while ((m = erreichtRegex.exec(gesamtText)) !== null) {
        aufgaben.push({
          aufgabeNr: nr++,
          bezeichnung: `Aufgabe ${nr - 1}`,
          erreichterPunkte: parseFloat(m[1].replace(",", ".")),
          maxPunkte: null,
        });
      }
    }

    res.json({ matrikelnummer, aufgaben });
  } catch (err) {
    res.status(500).json({ fehler: "OCR-Fehler: " + err.message });
  }
});

app.listen(3000, () => console.log("API läuft auf http://localhost:3000"));
>>>>>>> da000e74b58f96fb332ca017ee95fabc53687015
