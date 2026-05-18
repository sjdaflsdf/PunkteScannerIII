require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Google Vision API ────────────────────────────────────
const VISION_KEY = process.env.GOOGLE_VISION_KEY;

function normZiffernVision(text) {
  return text
    .replace(/[OoQD]/g, "0").replace(/[IiLl]/g, "1")
    .replace(/[Ss]/g, "5").replace(/[Bb]/g, "8")
    .replace(/[Zz]/g, "2").replace(/[Gg]/g, "9")
    .replace(/[^0-9]/g, "");
}

async function googleVision(bildPfad) {
  const fs = require("fs");
  const b64 = fs.readFileSync(bildPfad).toString("base64");
  const resp = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: b64 },
          features: [{ type: "TEXT_DETECTION" }],
          imageContext: { languageHints: ["en"] },
        }],
      }),
    }
  );
  const json = await resp.json();
  const text = json.responses?.[0]?.textAnnotations?.[0]?.description
    ?? json.responses?.[0]?.fullTextAnnotation?.text
    ?? "";
  return normZiffernVision(text);
}

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
// Prüfung anlegen: erst Prüfung, dann Aufgaben einzeln
app.post("/api/pruefungen/anlegen", async (req, res) => {
  const { aufgaben = [], ...pruefungDaten } = req.body;

  try {
    // 1. Prüfung anlegen (ohne aufgaben, mit berechneten Gesamtpunkten)
    const gesamtMax = aufgaben.reduce((s, a) => s + (Number(a.maxPunkte) || 0), 0);
    const pruefungRes = await fetch(`${DB_URL}/pruefungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pruefungDaten, maxPunkte: gesamtMax }),
    });

    if (!pruefungRes.ok) {
      const err = await pruefungRes.text();
      return res.status(pruefungRes.status).json({ fehler: err });
    }

    const pruefung = await parseDbResponse(pruefungRes);

    // 2. Aufgaben einzeln anlegen
    const angelegteAufgaben = [];
    for (const [i, a] of aufgaben.entries()) {
      const aufgabeRes = await fetch(`${DB_URL}/aufgaben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pruefung: { id: pruefung.id },
          aufgabeNr: i + 1,
          maxPunkte: Number(a.maxPunkte),
          bezeichnung: a.bezeichnung,
        }),
      });
      if (aufgabeRes.ok) {
        angelegteAufgaben.push(await parseDbResponse(aufgabeRes));
      }
    }

    res.status(201).json({ pruefung, aufgaben: angelegteAufgaben });
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

// ─── ENDPUNKT 11 ──────────────────────────────────────────
// OCR: Klausurseiten scannen → Matrikelnummer + Punkte extrahieren
app.post("/api/ocr/scan", upload.array("dateien", 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ fehler: "Keine Dateien hochgeladen." });
  }

  try {
    const Jimp = require("jimp");
    const { createWorker } = require("tesseract.js");

    const langPath = __dirname;

    // Tesseract für Anker-Erkennung + Matrikelnummer
    const workerVoll    = await createWorker("deu", 1, { langPath, cachePath: langPath });
    const workerZiffern = await createWorker("eng", 1, { langPath, cachePath: langPath });
    await workerZiffern.setParameters({ tessedit_pageseg_mode: "7" });

    async function zuBuffer(jimpBild) {
      return jimpBild.getBufferAsync(Jimp.MIME_PNG);
    }

    let matrikelnummer = null;
    const aufgaben = [];

    for (const datei of req.files) {
      const original = await Jimp.read(datei.buffer);
      const { width, height } = original.bitmap;
      console.log(`Bildgröße: ${width}x${height}`);

      // Vorverarbeitung für Anker-Erkennung: Graustufen + Kontrast
      const fuerAnker = original.clone()
        .greyscale()
        .normalize()
        .contrast(0.3);

      // Vorverarbeitung für Crops: Graustufen + stärkerer Kontrast
      const fuerCrops = original.clone()
        .greyscale()
        .normalize()
        .contrast(0.5);

      // Vollseiten-OCR mit Bounding-Boxes
      const { data } = await workerVoll.recognize(await zuBuffer(fuerAnker));

      // Wörter aus hierarchischer Struktur extrahieren
      const alleWoerter = (data.blocks ?? []).flatMap(b =>
        (b.paragraphs ?? []).flatMap(p =>
          (p.lines ?? []).flatMap(l => l.words ?? [])
        )
      );
      const woerter = (alleWoerter.length ? alleWoerter : data.words ?? [])
        .filter(w => w.bbox);

      // Zeilenebene als Fallback für Anker mit Bounding Boxes
      const zeilen = (data.blocks ?? []).flatMap(b =>
        (b.paragraphs ?? []).flatMap(p => p.lines ?? [])
      ).filter(l => l.bbox);

      console.log(`=== Seite: ${woerter.length} Wörter, ${zeilen.length} Zeilen ===`);
      woerter.filter(w => w.confidence > 40).forEach(w =>
        console.log(`"${w.text}" conf=${Math.round(w.confidence)} bbox=${JSON.stringify(w.bbox)}`)
      );

      // ── Matrikelnummer ──
      if (!matrikelnummer) {
        const matrikelAnker =
          woerter.find(w => /matrikel/i.test(w.text)) ??
          zeilen.find(l => /matrikel/i.test(l.text));
        if (matrikelAnker) {
          const { x0, y0, x1, y1 } = matrikelAnker.bbox;
          // Student schreibt rechts neben "Matrikel:" auf die Linie → rechts croppen
          const cropLeft   = Math.min(x1 + 4, width - 10);
          const cropTop    = Math.max(0, y0 - 4);
          const cropWidth  = Math.min(260, width - cropLeft);
          const cropHeight = Math.min(y1 - y0 + 14, height - cropTop);

          const matrikelCrop = fuerCrops.clone()
            .crop(cropLeft, cropTop, cropWidth, cropHeight)
            .scale(4)
            .threshold({ max: 140 });
          matrikelCrop.write("/tmp/crop_matrikel.png");

          const { data: md } = await workerZiffern.recognize(await zuBuffer(matrikelCrop));
          const normMd = md.text
            .replace(/[OoQDd]/g, "0").replace(/[IiLl]/g, "1")
            .replace(/[Ss]/g, "5").replace(/[Bb]/g, "8")
            .replace(/[Zz]/g, "2").replace(/[Gg]/g, "9");
          const ziffern = normMd.replace(/[^0-9]/g, "");
          if (ziffern.length >= 7) matrikelnummer = ziffern.slice(0, 8);
        }

        // Fallback: erste 7-8-stellige Zahl im Volltext (mit OCR-Zeichenkorrektur)
        if (!matrikelnummer) {
          const normVoll = (data.text ?? "")
            .replace(/S/g, "5").replace(/s/g, "5")
            .replace(/O/g, "0").replace(/o/g, "0")
            .replace(/I/g, "1").replace(/l/g, "1")
            .replace(/Z/g, "2").replace(/B/g, "8");
          const fb = normVoll.match(/\b(\d{7,8})\b/);
          if (fb) matrikelnummer = fb[1];
        }
      }

      // ── Punkte aus den Aufgaben-Feldern ──
      // Suche "A{n} ERREICHT" Zeilen — Aufgabennummer steht direkt davor
      const erreichtZeilen = zeilen
        .filter(l => /ERREICHT/i.test(l.text))
        .sort((a, b) => a.bbox.y0 - b.bbox.y0);

      // Fallback: einzelne ERREICHT-Wörter ohne Nummer
      const erreichtWoerter = woerter
        .filter(w => /^ERREICHT[:]?$/i.test(w.text))
        .sort((a, b) => a.bbox.y0 - b.bbox.y0);

      const erreichtLabels = erreichtZeilen.length ? erreichtZeilen : erreichtWoerter;
      console.log(`ERREICHT-Anker: ${erreichtLabels.length} (${erreichtZeilen.length} Zeilen, ${erreichtWoerter.length} Wörter)`);

      for (const label of erreichtLabels) {
        // Aufgabennummer aus "A3 ERREICHT" extrahieren (5/S und 2/Z Verwechslungen korrigieren)
        const normText = (label.text ?? "").replace(/S/g, "5").replace(/Z/g, "2").replace(/O/g, "0").replace(/I/g, "1").replace(/l/g, "1");
        const numMatch = normText.match(/A(\d+)\s*ERREICHT/i);
        const aufgabeNr = numMatch ? parseInt(numMatch[1]) : (aufgaben.length + 1);
        console.log(`  → Aufgabe ${aufgabeNr} erkannt aus: "${label.text}"`);

        const feldLeft   = Math.max(0, label.bbox.x0 - 5);
        const feldTop    = Math.min(height - 1, label.bbox.y1 + 6);
        const feldWidth  = Math.min(200, width - feldLeft);
        const feldHeight = Math.min(100, height - feldTop);

        console.log(`  Aufgabe ${aufgabeNr}: crop L=${feldLeft} T=${feldTop} W=${feldWidth} H=${feldHeight}`);

        if (feldWidth <= 0 || feldHeight <= 0) continue;

        // Zwei Ziffernboxen per EasyOCR erkennen
        const labelMitte = Math.round((label.bbox.x0 + label.bbox.x1) / 2);
        const BOX_W = 69;
        const GAP_W = 9;
        const ocrLinks = Math.max(0, labelMitte - BOX_W - Math.round(GAP_W / 2));
        const boxHoehe = Math.min(100, height - feldTop);

        // Beide Boxen als ein gemeinsames Bild (weniger API-Calls, bessere Erkennung)
        const bPfad = `/tmp/crop_A${aufgabeNr}.png`;
        const INSET = 5;
        const gesamtBreite = BOX_W * 2 + GAP_W;
        const innerH = Math.max(10, boxHoehe - INSET * 2);
        fuerCrops.clone()
          .crop(ocrLinks + INSET, feldTop + INSET, gesamtBreite - INSET * 2, innerH)
          .scale(3).threshold({ max: 140 }).write(bPfad);

        const roh = await googleVision(bPfad);
        console.log(`  A${aufgabeNr}: "${roh}"`);
        const punkte = parseFloat(roh);

        // Duplikate überspringen — gleiche aufgabeNr bereits vorhanden
        if (aufgaben.some(a => a.aufgabeNr === aufgabeNr)) {
          console.log(`  Aufgabe ${aufgabeNr} übersprungen (Duplikat)`);
          continue;
        }

        aufgaben.push({
          aufgabeNr,
          bezeichnung: `Aufgabe ${aufgabeNr}`,
          erreichterPunkte: isNaN(punkte) ? null : Math.round(punkte * 10) / 10,
        });
      }
    }

    await workerVoll.terminate();
    await workerZiffern.terminate();

    aufgaben.sort((a, b) => a.aufgabeNr - b.aufgabeNr);
    res.json({ matrikelnummer, aufgaben });
  } catch (err) {
    res.status(500).json({ fehler: "OCR-Fehler: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
