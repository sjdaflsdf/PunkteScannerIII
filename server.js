require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Tesseract: ein einziger Worker für Ziffern ──────────
let _worker = null;
let _initPromise = null;

function holeWorker() {
  if (_worker) return Promise.resolve(_worker);
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const { createWorker } = require("tesseract.js");
    const lp = __dirname;
    _worker = await createWorker("eng", 1, { langPath: lp, cachePath: lp });
    await _worker.setParameters({
      tessedit_pageseg_mode: "7",
      tessedit_char_whitelist: "0123456789",
    });
    console.log("Tesseract bereit");
    return _worker;
  })();
  return _initPromise;
}

// Tesseract beim Server-Start vorwärmen → erster Scan sofort schnell
setImmediate(() => holeWorker().catch(() => {}));

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

// ─── Bild-Ausrichtung via Eckmarker ───────────────────────
// Die schwarzen Dreiecke in den Seitenecken des Templates werden
// gesucht um Winkel und Maßstab automatisch zu korrigieren.
function ausrichten(bild, Jimp) {
  const W = bild.bitmap.width;
  const R = Math.round(160 * W / 1440); // Suchregion skaliert mit Bildbreite

  // Schwellwert-Bild für Marker-Suche
  const thresh = bild.clone().greyscale().threshold({ max: 60 });
  const { data, width, height } = thresh.bitmap;

  // Schwerpunkt dunkler Pixel in einem Rechteck berechnen
  function schwerpunkt(x0, x1, y0, y1) {
    let sx = 0, sy = 0, n = 0;
    for (let y = Math.max(0,y0); y < Math.min(height,y1); y++) {
      for (let x = Math.max(0,x0); x < Math.min(width,x1); x++) {
        if (data[(y * width + x) * 4] < 128) { sx += x; sy += y; n++; }
      }
    }
    return n > 20 ? { x: sx / n, y: sy / n } : null;
  }

  const tl = schwerpunkt(0, R, 0, R);
  const tr = schwerpunkt(W - R, W, 0, R);

  if (!tl || !tr) {
    console.log("Eckmarker nicht gefunden – kein Winkel-Fix");
    return bild;
  }

  const winkel = Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI;
  console.log(`Eckmarker: TL=(${Math.round(tl.x)},${Math.round(tl.y)}) TR=(${Math.round(tr.x)},${Math.round(tr.y)}) Winkel=${winkel.toFixed(2)}°`);

  if (Math.abs(winkel) > 0.3) {
    bild.rotate(-winkel);
  }
  return bild;
}

// ─── ENDPUNKT 11 ──────────────────────────────────────────
// OCR: Klausurseiten scannen → Matrikelnummer + Punkte extrahieren
// Template-basierter Ansatz: feste X-Koordinaten aus CSS-Vorlage,
// nur schmale Streifen scannen statt Vollseite → deutlich schneller
app.post("/api/ocr/scan", upload.array("dateien", 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ fehler: "Keine Dateien hochgeladen." });
  }

  try {
    const Jimp = require("jimp");
    const worker = await holeWorker();

    async function zuBuffer(img) { return img.getBufferAsync(Jimp.MIME_PNG); }

    // Findet Y-Positionen der Ziffernboxen über Pixel-Analyse.
    // Die schwarzen Boxrahmen (border:2.5px solid #000) bilden bei bekanntem X
    // eine durchgehende dunkle Spalte → schnell, kein OCR nötig.
    // Scannt eine vertikale Spalte und gibt alle dunklen Pixel-Runs zurück
    function scanSpalte(data, width, height, scanX, minH, maxH) {
      const dunkel = [];
      for (let y = 0; y < height; y++) {
        if (data[(y * width + scanX) * 4] < 100) dunkel.push(y);
      }
      if (dunkel.length === 0) return [];
      const runs = [];
      let start = dunkel[0], prev = dunkel[0];
      for (let i = 1; i < dunkel.length; i++) {
        if (dunkel[i] - prev > 4) {
          const h = prev - start;
          if (h >= minH && h <= maxH) runs.push({ y0: start, y1: prev });
          start = dunkel[i];
        }
        prev = dunkel[i];
      }
      const h = prev - start;
      if (h >= minH && h <= maxH) runs.push({ y0: start, y1: prev });
      return runs;
    }

    function findeBoxPositionen(bild) {
      const thresh = bild.clone().threshold({ max: 80 });
      const { width, height, data } = thresh.bitmap;

      // Strategie 1: Dreieck-Anker (▶) links neben der Box.
      // Das Dreieck: border-top:4mm + border-bottom:4mm = 8mm ≈ 55px bei 1440px.
      // X-Position: .apkt left (~1143) + padding (18) + centered offset (~4) = ~1165
      const ANKER_X = 1165;
      const ankerRuns = scanSpalte(data, width, height, ANKER_X, 45, 70);
      if (ankerRuns.length > 0) {
        console.log(`  Anker-Methode: ${ankerRuns.length} Dreiecke bei x=${ANKER_X}`);
        // Dreieck-Mitte → Box-Top: Dreieck liegt auf Höhe der Boxen (align-items:center)
        return ankerRuns.map(r => ({ y0: r.y0, y1: r.y0 + OCR_H }));
      }

      // Strategie 2: Boxrahmen-Scan (Fallback)
      // Der linke Rahmen der ersten Box ist 91px hoch bei x=OCR_L+2
      const rahmenRuns = scanSpalte(data, width, height, OCR_L + 2, 70, 110);
      console.log(`  Rahmen-Methode (Fallback): ${rahmenRuns.length} Boxen bei x=${OCR_L + 2}`);
      return rahmenRuns;
    }

    // Template-Koordinaten bei exakt 1440px Breite (A4-Vorlage)
    const TW    = 1440;
    const OCR_L = 1200;  // linke Kante der Ziffernbox (60px CSS: .apkt left ~1143 + padding 18 + anchor ~39 = ~1200)
    const OCR_W = 109;   // Breite: 1 Box (60 CSS px × 1.814)
    const OCR_H = 91;    // Höhe einer Box (50 CSS px × 1.814)
    const MAT_X = 1050;  // ab hier liegt das Matrikel-Feld im Header
    const HDR_H = 160;   // Header-Höhe
    const INSET = 12;    // Einzug vom Boxrahmen

    let matrikelnummer = null;
    const aufgaben = [];

    for (const datei of req.files) {
      const eingelesen = await Jimp.read(datei.buffer);
      console.log(`Originalgröße: ${eingelesen.bitmap.width}x${eingelesen.bitmap.height}`);

      // Bild ausrichten (Eckmarker-Erkennung) + auf 1440px normalisieren
      const original = ausrichten(eingelesen, Jimp).resize(TW, Jimp.AUTO);
      const { width: W, height: H } = original.bitmap;
      console.log(`Normalisiert: ${W}x${H}`);

      const fuerCrops = original.clone().greyscale().normalize().contrast(0.5);

      // ── 1. Matrikelnummer: obere rechte Ecke scannen ──────────────────
      // Nur Ziffern OCR → Buchstaben werden ignoriert, lange Ziffernfolge = Matrikel
      if (!matrikelnummer) {
        const matBuf = await zuBuffer(
          fuerCrops.clone().crop(MAT_X, 0, W - MAT_X, HDR_H).scale(3).threshold({ max: 140 })
        );
        const { data: md } = await worker.recognize(matBuf);
        const norm = md.text
          .replace(/[OoQDd]/g, "0").replace(/[IiLl]/g, "1")
          .replace(/[Ss]/g, "5").replace(/[Bb]/g, "8")
          .replace(/[Zz]/g, "2").replace(/[Gg]/g, "9");
        // Alle Ziffernblöcke extrahieren, längsten (= Matrikel) nehmen
        const bloecke = norm.replace(/[^0-9]+/g, " ").trim().split(/\s+/).filter(b => b.length >= 7);
        if (bloecke.length > 0) {
          matrikelnummer = bloecke.sort((a, b) => b.length - a.length)[0].slice(0, 8);
        }
        console.log(`Matrikelnummer: ${matrikelnummer ?? "nicht erkannt"}`);
      }

      // ── 2. Ziffernbox-Positionen per Pixel-Analyse finden ────────────
      // Kein Tesseract nötig: schwarze Boxrahmen an bekanntem X bilden dunkle Spalten
      const boxPositionen = findeBoxPositionen(fuerCrops);
      console.log(`Ziffernboxen gefunden: ${boxPositionen.length}`);

      // ── 3. Alle Aufgaben-Crops stapeln → ein einziger OCR-Aufruf ────────
      const SCALE   = 3;
      const cropL   = Math.max(0, OCR_L + INSET);
      const cropCW  = Math.max(10, OCR_W - 2 * INSET);
      const ZEILEN_H = Math.round((OCR_H - 2 * INSET) * SCALE);
      const GAP      = 20;  // px Abstand zwischen Zeilen im gestapelten Bild

      if (boxPositionen.length > 0) {
        const gesH = boxPositionen.length * ZEILEN_H + (boxPositionen.length - 1) * GAP;
        const gesB = Math.round(cropCW * SCALE);
        const stapel = new Jimp(gesB, gesH, 0xffffffff);

        for (let i = 0; i < boxPositionen.length; i++) {
          const { y0: boxTop, y1: boxBottom } = boxPositionen[i];
          const cropT  = Math.max(0, boxTop + INSET);
          const cropCH = Math.max(10, Math.min(boxBottom - boxTop - 2 * INSET, H - cropT));
          console.log(`  A${i+1}: boxTop=${boxTop} cropT=${cropT} cropH=${cropCH}`);

          const slice = fuerCrops.clone()
            .crop(cropL, cropT, cropCW, cropCH)
            .scale(SCALE).threshold({ max: 160 })
            .resize(gesB, ZEILEN_H);

          if (i <= 4) slice.clone().write(`/tmp/debug_A${i+1}.png`);
          stapel.composite(slice, 0, i * (ZEILEN_H + GAP));
        }

        await worker.setParameters({ tessedit_pageseg_mode: "6" });
        const { data: zd } = await worker.recognize(await zuBuffer(stapel));
        await worker.setParameters({ tessedit_pageseg_mode: "7" });

        const zeilen = zd.text.split("\n").map(z => z.replace(/[^0-9]/g, "")).filter(z => z.length > 0);
        console.log(`  OCR-Zeilen (${zeilen.length}): ${zeilen.join(", ")}`);

        for (let i = 0; i < boxPositionen.length; i++) {
          const roh = zeilen[i] ?? "";
          const punkte = roh.length > 0 ? parseInt(roh.slice(0, 2)) : null;
          console.log(`  A${i+1}: "${roh}" → ${punkte}`);
          aufgaben.push({ aufgabeNr: i + 1, bezeichnung: `Aufgabe ${i+1}`, erreichterPunkte: punkte });
        }
      }
    }

    aufgaben.sort((a, b) => a.aufgabeNr - b.aufgabeNr);
    res.json({ matrikelnummer, aufgaben });
  } catch (err) {
    res.status(500).json({ fehler: "OCR-Fehler: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
