const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

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
// Erwartet: { pruefungId, matrikelnummer, erreichterPunkte: [8, 13, 5], notenschluessel? }
// maxPunkte werden aus der DB geladen, Student wird per matNr aufgelöst oder neu angelegt.
app.post("/api/pruefung/auswerten", async (req, res) => {
  const { pruefungId, matrikelnummer, erreichterPunkte, notenschluessel } = req.body;

  if (!pruefungId || !matrikelnummer || !Array.isArray(erreichterPunkte)) {
    return res.status(400).json({ fehler: "pruefungId, matrikelnummer und erreichterPunkte sind Pflichtfelder." });
  }

  // 1. Aufgaben (inkl. maxPunkte) aus DB laden
  let aufgabenAusDB;
  try {
    const response = await fetch(`${DB_URL}/aufgaben/pruefung/${pruefungId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    aufgabenAusDB = await response.json();
  } catch (err) {
    return res.status(500).json({ fehler: "Aufgaben konnten nicht geladen werden: " + err.message });
  }

  if (aufgabenAusDB.length === 0) {
    return res.status(400).json({ fehler: "Keine Aufgaben für diese Prüfung gefunden." });
  }
  if (erreichterPunkte.length !== aufgabenAusDB.length) {
    return res.status(400).json({
      fehler: `Anzahl der Punkte (${erreichterPunkte.length}) passt nicht zur Anzahl der Aufgaben (${aufgabenAusDB.length}).`
    });
  }

  // Aufgaben sortieren und mit erreichten Punkten zusammenführen
  aufgabenAusDB.sort((a, b) => a.aufgabeNr - b.aufgabeNr);
  const aufgabenFuerLogik = aufgabenAusDB.map((a, i) => ({
    name: a.bezeichnung || `Aufgabe ${a.aufgabeNr}`,
    punkte: Number(erreichterPunkte[i]),
    maxPunkte: a.maxPunkte,
  }));

  // 2. Student per matNr suchen
  let student;
  try {
    const sucheRes = await fetch(`${DB_URL}/studenten/matnr/${encodeURIComponent(matrikelnummer)}`);
    if (sucheRes.ok) {
      student = await sucheRes.json();
    } else if (sucheRes.status === 404) {
      return res.status(404).json({
        studentNichtGefunden: true,
        matrikelnummer,
        fehler: `Student mit Matrikelnummer ${matrikelnummer} ist nicht in der Datenbank.`,
      });
    } else {
      throw new Error(`HTTP ${sucheRes.status}`);
    }
  } catch (err) {
    if (err.message.includes("studentNichtGefunden")) throw err;
    return res.status(500).json({ fehler: "Student-Suche fehlgeschlagen: " + err.message });
  }

  // 3. Note berechnen
  let ergebnis;
  try {
    ergebnis = pruefungAuswerten({
      aufgaben: aufgabenFuerLogik,
      notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL,
    });
  } catch (err) {
    return res.status(400).json({ fehler: "Berechnung fehlgeschlagen: " + err.message });
  }

  // 4. Ergebnis in DB speichern
  try {
    const response = await fetch(`${DB_URL}/ergebnisse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pruefung: { id: pruefungId },
        student: { id: student.id },
        gesamtPunkte: ergebnis.punkte,
        note: ergebnis.note,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("DB Fehler:", response.status, errorText);
    }
  } catch (err) {
    console.error("DB speichern fehlgeschlagen:", err.message);
  }

  // 5. Prüfungsname für Ergebnisanzeige laden (best-effort)
  let pruefungName = null;
  try {
    const pr = await fetch(`${DB_URL}/pruefungen/${pruefungId}`);
    if (pr.ok) pruefungName = (await pr.json()).name ?? null;
  } catch { /* optional */ }

  // 6. Antwort ans Frontend (inkl. Aufgaben-Detail für Ergebnisanzeige)
  res.json({
    ...ergebnis,
    pruefungName,
    matrikelnummer,
    aufgaben: aufgabenFuerLogik,
  });
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
// Student per Matrikelnummer suchen
app.get("/api/studenten/matnr/:matNr", async (req, res) => {
  try {
    const r = await fetch(`${DB_URL}/studenten/matnr/${encodeURIComponent(req.params.matNr)}`);
    if (r.status === 404) return res.status(404).json({ studentNichtGefunden: true });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ fehler: "Suche fehlgeschlagen: " + err.message });
  }
});

// ─── ENDPUNKT 6 ───────────────────────────────────────────
// Neuen Studenten anlegen
app.post("/api/studenten", async (req, res) => {
  try {
    const r = await fetch(`${DB_URL}/studenten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    res.status(201).json(await r.json());
  } catch (err) {
    res.status(500).json({ fehler: "Student anlegen fehlgeschlagen: " + err.message });
  }
});

// ─── ENDPUNKT 7 ───────────────────────────────────────────
// OCR: Gescannte Klausurseiten → Matrikelnummer + Punkte extrahieren
app.post("/api/ocr/scan", upload.array("dateien", 30), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ fehler: "ANTHROPIC_API_KEY ist nicht gesetzt. Bitte in der .env-Datei eintragen." });
  }

  const { pruefungId } = req.body;
  if (!pruefungId || !req.files?.length) {
    return res.status(400).json({ fehler: "pruefungId und mindestens eine Datei sind erforderlich." });
  }

  // Aufgaben der Prüfung aus DB laden
  let aufgaben;
  try {
    const r = await fetch(`${DB_URL}/aufgaben/pruefung/${pruefungId}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    aufgaben = (await r.json()).sort((a, b) => a.aufgabeNr - b.aufgabeNr);
  } catch (err) {
    return res.status(500).json({ fehler: "Aufgaben laden fehlgeschlagen: " + err.message });
  }
  if (aufgaben.length === 0) {
    return res.status(400).json({ fehler: "Keine Aufgaben für diese Prüfung gefunden." });
  }

  const maxPunkteProAufgabe = aufgaben.map(a => a.maxPunkte).join(", ");
  const anzahlAufgaben = aufgaben.length;

  // Content-Blöcke für Claude aufbauen: erst Text-Prompt, dann alle Bilder/PDFs
  const contentBlocks = [
    {
      type: "text",
      text: `Diese Bilder zeigen eine oder mehrere Seiten einer deutschen Universitäts-Klausur mit ${anzahlAufgaben} Aufgaben.

Aufbau des Templates:
- Kopfzeile (wiederholt auf jeder Seite): Klausurname, Datum, Maximalpunkte. Ganz rechts zwei kurze Unterstriche: "Name: ___" und "Matrikel: ___"
- Seite 1 oben: Ein "Studierenden-Informationen"-Block mit großen gestrichelten Feldern für Matrikelnummer und Unterschrift
- Pro Aufgabe: Ein grünes Kreis-Badge mit der Aufgabennummer links, der Aufgabentext in der Mitte, und rechts ein kleines gestricheltes Kästchen wo die Punkte handschriftlich eingetragen werden (Format: "_____ / MaxPunkte")
- Die Maximalpunkte pro Aufgabe sind: ${maxPunkteProAufgabe} (in dieser Reihenfolge für Aufgabe 1 bis ${anzahlAufgaben})

Extrahiere genau diese zwei Informationen:
1. Die MATRIKELNUMMER: Die handschriftlich eingetragene Zahl im großen gestrichelten Matrikelnummer-Feld auf Seite 1 (typischerweise 7-8 Stellen)
2. Die ERREICHTEN PUNKTE: Die handschriftliche Zahl in jedem kleinen gestrichelten Punkte-Kästchen rechts, für Aufgabe 1 bis ${anzahlAufgaben} in dieser Reihenfolge

Antworte AUSSCHLIESSLICH mit diesem JSON-Format (kein Markdown, keine Erklärung, kein Text davor oder danach):
{"matrikelnummer": "12345678", "punkte": [8, 13, 5]}

Wichtig:
- Die "punkte"-Liste muss exakt ${anzahlAufgaben} Einträge haben
- Falls ein Wert nicht lesbar oder leer ist, verwende null
- Nur die Zahl eintragen, nicht "8/10", nur "8"`
    }
  ];

  for (const file of req.files) {
    if (file.mimetype === "application/pdf") {
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: file.buffer.toString("base64") },
      });
    } else {
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: file.mimetype, data: file.buffer.toString("base64") },
      });
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 300,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const text = message.content[0].text.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    let extracted;
    try {
      extracted = JSON.parse(text);
    } catch {
      return res.status(500).json({ fehler: "OCR-Antwort konnte nicht geparst werden: " + text });
    }

    res.json({
      matrikelnummer: extracted.matrikelnummer ?? "",
      aufgaben: aufgaben.map((a, i) => ({
        aufgabeNr: a.aufgabeNr,
        bezeichnung: a.bezeichnung || `Aufgabe ${a.aufgabeNr}`,
        maxPunkte: a.maxPunkte,
        erreichterPunkte: extracted.punkte?.[i] ?? null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ fehler: "OCR fehlgeschlagen: " + err.message });
  }
});

// ─── ENDPUNKT 8 ───────────────────────────────────────────
// Prüfung + Aufgaben in einem Schritt anlegen und in DB speichern
app.post("/api/pruefungen/anlegen", async (req, res) => {
  const { name, datum, aufgaben } = req.body;

  if (!name || !aufgaben || aufgaben.length === 0) {
    return res.status(400).json({ fehler: "name und aufgaben sind Pflichtfelder." });
  }

  const maxPunkte = aufgaben.reduce((sum, a) => sum + Number(a.maxPunkte), 0);

  // 1. Prüfung anlegen
  let pruefung;
  try {
    const response = await fetch(`${DB_URL}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, datum: datum || null, maxPunkte, status: "entwurf" }),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ fehler: `Prüfung konnte nicht gespeichert werden: ${text}` });
    }
    pruefung = await response.json();
  } catch (err) {
    return res.status(500).json({ fehler: "DB nicht erreichbar: " + err.message });
  }

  // 2. Aufgaben anlegen
  const gespeicherteAufgaben = [];
  for (const [i, aufgabe] of aufgaben.entries()) {
    try {
      const response = await fetch(`${DB_URL}/aufgaben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pruefung: { id: pruefung.id },
          aufgabeNr: i + 1,
          maxPunkte: Number(aufgabe.maxPunkte),
          bezeichnung: aufgabe.bezeichnung || "",
        }),
      });
      if (response.ok) {
        gespeicherteAufgaben.push(await response.json());
      } else {
        console.error(`Aufgabe ${i + 1} konnte nicht gespeichert werden`);
      }
    } catch (err) {
      console.error(`Aufgabe ${i + 1} fehlgeschlagen:`, err.message);
    }
  }

  res.status(201).json({ pruefung, aufgaben: gespeicherteAufgaben });
});

// ─── ENDPUNKT 9 ───────────────────────────────────────────
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