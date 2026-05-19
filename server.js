require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── MNIST: handgeschriebene Ziffern erkennen ────────────
const path = require("path");
let _ortSession = null;

function holeMnistSession() {
  if (_ortSession) return Promise.resolve(_ortSession);
  return (async () => {
    const ort = require("onnxruntime-node");
    _ortSession = await ort.InferenceSession.create(
      path.join(__dirname, "mnist-12.onnx")
    );
    console.log("MNIST bereit");
    return _ortSession;
  })();
}

setImmediate(() => holeMnistSession().catch(e => console.error("MNIST load:", e.message)));

async function erkennZiffer(jimpImg) {
  const ort = require("onnxruntime-node");
  const session = await holeMnistSession();
  const img = jimpImg.clone().greyscale().threshold({ max: 128 }).invert().resize(28, 28);
  const { data } = img.bitmap;
  const input = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) input[i] = data[i * 4] / 255;
  const tensor = new ort.Tensor("float32", input, [1, 1, 28, 28]);
  const out = await session.run({ [session.inputNames[0]]: tensor });
  const scores = Array.from(out[session.outputNames[0]].data);
  const max = Math.max(...scores);
  const exps = scores.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b);
  const probs = exps.map(x => x / sum);
  const digit = probs.indexOf(Math.max(...probs));
  return { digit, conf: probs[digit] };
}

function pixelDichte(jimpImg) {
  const { data } = jimpImg.clone().greyscale().bitmap;
  let dunkel = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dunkel++;
  return dunkel / (data.length / 4);
}

async function erkennPunktzahl(boxImg) {
  if (pixelDichte(boxImg) < 0.02) return null;
  const W = boxImg.bitmap.width;
  const H = boxImg.bitmap.height;
  const halb = Math.floor(W / 2);
  const links  = boxImg.clone().crop(0,    0, halb,     H);
  const rechts = boxImg.clone().crop(halb, 0, W - halb, H);
  const dL = pixelDichte(links);
  const dR = pixelDichte(rechts);
  if (dL > 0.04 && dR > 0.04) {
    const l = await erkennZiffer(links);
    const r = await erkennZiffer(rechts);
    console.log(`    2-stellig: ${l.digit}(${l.conf.toFixed(2)}) ${r.digit}(${r.conf.toFixed(2)})`);
    return l.digit * 10 + r.digit;
  }
  const { digit, conf } = await erkennZiffer(dR >= dL ? rechts : links);
  console.log(`    1-stellig: ${digit}(${conf.toFixed(2)})`);
  return digit;
}

// Hilfsfunktion: DB-Antwort parsen — auch bei leerem Body (z.B. 404 ohne JSON)
async function parseDbResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Adresse vom Spring Boot Server (DB)
const DB_URL = "https://punktescanneriii.onrender.com/api";

// ─── HEALTHCHECKS ────────────────────────────────────────
app.get("/api/health/ocr", async (_req, res) => {
  try {
    const session = await holeMnistSession();
    res.json({ status: "ok", inputs: session.inputNames, outputs: session.outputNames });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message, cause: err.cause?.message ?? null, stack: err.stack?.split("\n").slice(0, 5) });
  }
});

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
    cconst response = await fetch(`${DB_URL}/aufgaben/pruefung/${req.params.id}`);
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
// MNIST-basiert: kein Tesseract, kein externer API-Aufruf
app.post("/api/ocr/scan", upload.array("dateien", 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ fehler: "Keine Dateien hochgeladen." });
  }

  try {
    const Jimp = require("jimp");

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

    // Template-Koordinaten bei exakt 1440px Breite (A4-Vorlage, 1 CSS px ≈ 1.817 scan px)
    const TW      = 1440;
    const OCR_L   = 1185;  // linke Kante der Punktebox
    const OCR_W   = 109;   // Breite der Punktebox (60 CSS px × 1.817)
    const OCR_H   = 91;    // Höhe einer Punktebox (50 CSS px × 1.817)
    const ANKER_X = 1150;  // X-Spalte für Dreieck-Anker-Scan
    const INSET   = 10;    // Einzug vom Boxrahmen für sauberen Crop
    // Matrikel: 8 individuelle Kästchen (30×36 CSS px) → 54×65 scan px, Abstand 33 CSS px = 60 scan px
    const MAT_BOX_X0 = 920;  // scan-X linke Kante erste Box (≈918px berechnet)
    const MAT_BOX_W  = 54;   // Breite (30 CSS px × 1.817)
    const MAT_BOX_H  = 65;   // Höhe (36 CSS px × 1.817)
    const MAT_BOX_DX = 60;   // Abstand Box-zu-Box (33 CSS px × 1.817)
    const MAT_BOX_Y0 = 200;  // Y-Oberkante der Matrikelboxen im Header

    function findeBoxPositionen(bild) {
      const thresh = bild.clone().threshold({ max: 80 });
      const { width, height, data } = thresh.bitmap;

      // Strategie 1: Dreieck-Anker (▶) links neben der Box
      const ankerRuns = scanSpalte(data, width, height, ANKER_X, 45, 70);
      if (ankerRuns.length > 0) {
        console.log(`  Anker-Methode: ${ankerRuns.length} Dreiecke bei x=${ANKER_X}`);
        return ankerRuns.map(r => ({ y0: r.y0, y1: r.y0 + OCR_H }));
      }

      // Strategie 2: Boxrahmen-Scan (Fallback)
      const rahmenRuns = scanSpalte(data, width, height, OCR_L + 2, 70, 110);
      console.log(`  Rahmen-Methode (Fallback): ${rahmenRuns.length} Boxen bei x=${OCR_L + 2}`);
      return rahmenRuns;
    }

    let matrikelnummer = null;
    const aufgaben = [];

    for (const datei of req.files) {
      const eingelesen = await Jimp.read(datei.buffer);
      console.log(`Originalgröße: ${eingelesen.bitmap.width}x${eingelesen.bitmap.height}`);

      const original = ausrichten(eingelesen, Jimp).resize(TW, Jimp.AUTO);
      const { width: W, height: H } = original.bitmap;
      console.log(`Normalisiert: ${W}x${H}`);

      const fuerCrops = original.clone().greyscale().normalize().contrast(0.5);

      // ── 1. Matrikelnummer: 8 einzelne MNIST-Boxen ──────────────────────
      if (!matrikelnummer) {
        const ziffern = [];
        for (let k = 0; k < 8; k++) {
          const bx = MAT_BOX_X0 + k * MAT_BOX_DX;
          const by = Math.max(0, MAT_BOX_Y0 - Math.floor(MAT_BOX_H / 2));
          const bw = Math.min(MAT_BOX_W, W - bx);
          const bh = Math.min(MAT_BOX_H, H - by);
          if (bw <= 0 || bh <= 0) { ziffern.push(null); continue; }
          const box = fuerCrops.clone().crop(bx, by, bw, bh);
          const ziffer = await erkennZiffer(box);
          console.log(`  Matrikel[${k}]: ${ziffer.digit} (conf=${ziffer.conf.toFixed(2)})`);
          ziffern.push(ziffer.conf > 0.5 ? ziffer.digit : null);
        }
        const rohMatrikel = ziffern.map(z => z !== null ? String(z) : "?").join("");
        if (!rohMatrikel.includes("?")) {
          matrikelnummer = rohMatrikel;
        } else {
          matrikelnummer = rohMatrikel; // trotzdem übernehmen, ? markiert unsichere Stellen
        }
        console.log(`Matrikelnummer: ${matrikelnummer}`);
      }

      // ── 2. Aufgaben-Boxen per Pixel-Analyse finden ───────────────────
      const boxPositionen = findeBoxPositionen(fuerCrops);
      console.log(`Ziffernboxen gefunden: ${boxPositionen.length}`);

      // ── 3. Jede Box einzeln per MNIST erkennen ───────────────────────
      for (let i = 0; i < boxPositionen.length; i++) {
        const { y0: boxTop, y1: boxBottom } = boxPositionen[i];
        const cropT  = Math.max(0, boxTop + INSET);
        const cropCH = Math.max(10, Math.min(boxBottom - boxTop - 2 * INSET, H - cropT));
        const cropL2 = Math.max(0, OCR_L + INSET);
        const cropCW = Math.max(10, OCR_W - 2 * INSET);
        console.log(`  A${i+1}: boxTop=${boxTop} cropT=${cropT} cropH=${cropCH}`);

        const boxImg = fuerCrops.clone().crop(cropL2, cropT, cropCW, cropCH);
        const punkte = await erkennPunktzahl(boxImg);
        console.log(`  A${i+1}: → ${punkte}`);
        aufgaben.push({ aufgabeNr: i + 1, bezeichnung: `Aufgabe ${i+1}`, erreichterPunkte: punkte });
      }
    }

    aufgaben.sort((a, b) => a.aufgabeNr - b.aufgabeNr);
    res.json({ matrikelnummer, aufgaben });
  } catch (err) {
    console.error("OCR-Fehler stack:", err.stack);
    console.error("OCR-Fehler cause:", err.cause);
    res.status(500).json({
      fehler: "OCR-Fehler: " + err.message,
      cause: err.cause?.message ?? err.cause ?? null,
      stack: err.stack?.split("\n").slice(0, 5),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
