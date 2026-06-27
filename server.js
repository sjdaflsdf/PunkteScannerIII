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
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const execFileP = require("util").promisify(execFile);
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

// ─── PDF-Support: PDF-Seiten zu PNG-Buffern rendern ──────────────────────
// Scanner-Apps liefern oft PDFs. Jimp liest aber nur Bilder → PDF-Seiten
// vorher per pdf-to-png-converter zu PNG-Buffern rendern (ESM, lazy geladen).
let _pdfToPng = null;
async function holePdfToPng() {
  if (!_pdfToPng) {
    const mod = await import("pdf-to-png-converter");
    _pdfToPng = mod.pdfToPng ?? mod.default?.pdfToPng;
  }
  return _pdfToPng;
}

// Hochgeladene Dateien → Liste von Bild-Buffern (PDFs werden seitenweise gerendert)
async function dateienZuBildBuffern(files) {
  const bilder = [];
  for (const f of files) {
    const istPdf = f.mimetype === "application/pdf" || /\.pdf$/i.test(f.originalname || "");
    if (istPdf) {
      const pdfToPng = await holePdfToPng();
      const seiten = await pdfToPng(new Uint8Array(f.buffer), { viewportScale: 3.0 });
      for (const s of seiten) if (s.content) bilder.push(s.content);
      console.log(`PDF ${f.originalname || ""}: ${seiten.length} Seite(n) gerendert`);
    } else {
      bilder.push(f.buffer);
    }
  }
  return bilder;
}

// Otsu-Methode: optimalen Binärschwellwert aus Histogramm berechnen
function otsuSchwellwert(jimpImg) {
  const { data } = jimpImg.bitmap;
  const hist = new Array(256).fill(0);
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) hist[data[i]]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * ((sumB / wB) - ((sum - sumB) / wF)) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

// Bounding-Box der hellen (Ziffer-)Pixel im bereits invertierten Bild
function zifferBbox(binaryImg) {
  const { data, width, height } = binaryImg.bitmap;
  let minX = width, maxX = 0, minY = height, maxY = 0, found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] > 128) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
}

// Anteil Tinte (heller Pixel im invertierten Binärbild)
function inkRatio(binaryImg) {
  const { data } = binaryImg.bitmap;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 128) n++;
  return n / (data.length / 4);
}

// Entfernt gedruckte Kästchen-Rahmen in zwei Durchgängen:
//  1) Durchgehende Rahmenlinien im Randband löschen (auch wenn sie nicht
//     exakt am Bildrand kleben) — ein Frame ist eine fast-volle Zeile/Spalte.
//  2) Flood-Fill vom Bildrand für restliche randverbundene Tinte.
// Eine geschützte Mittelzone bleibt unangetastet, damit eine zentrierte Ziffer
// erhalten bleibt — selbst wenn sie den Rahmen berührt (nur ihr Ausläufer fällt weg).
function entferneRahmen(binaryImg) {
  const { data, width, height } = binaryImg.bitmap;
  const ink = i => data[i * 4] > 128;
  const loesch = i => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0; };

  // ── Pass 1: Rahmenlinien im Randband ──
  const bandX = Math.round(width * 0.28);
  const bandY = Math.round(height * 0.28);
  const zeileVoll  = y => { let n = 0; for (let x = 0; x < width; x++)  if (ink(y * width + x)) n++; return n / width  > 0.55; };
  const spalteVoll = x => { let n = 0; for (let y = 0; y < height; y++) if (ink(y * width + x)) n++; return n / height > 0.55; };
  for (let y = 0; y < bandY; y++)                 if (zeileVoll(y))  for (let x = 0; x < width; x++)  loesch(y * width + x);
  for (let y = height - 1; y >= height - bandY; y--) if (zeileVoll(y))  for (let x = 0; x < width; x++)  loesch(y * width + x);
  for (let x = 0; x < bandX; x++)                 if (spalteVoll(x)) for (let y = 0; y < height; y++) loesch(y * width + x);
  for (let x = width - 1; x >= width - bandX; x--)   if (spalteVoll(x)) for (let y = 0; y < height; y++) loesch(y * width + x);

  // ── Pass 2: Flood-Fill vom Rand, Mittelzone geschützt ──
  const mx = Math.round(width * 0.24);
  const my = Math.round(height * 0.24);
  const imZentrum = (x, y) => x >= mx && x < width - mx && y >= my && y < height - my;
  const besucht = new Uint8Array(width * height);
  const stack = [];
  const rein = p => { if (!besucht[p]) { besucht[p] = 1; stack.push(p); } };
  for (let x = 0; x < width; x++) { rein(x); rein((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { rein(y * width); rein(y * width + width - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (!ink(p)) continue;
    const x = p % width, y = (p / width) | 0;
    if (imZentrum(x, y)) continue;  // Schutzzone: Ziffer nicht anfassen
    loesch(p);
    if (x > 0) rein(p - 1);
    if (x < width - 1) rein(p + 1);
    if (y > 0) rein(p - width);
    if (y < height - 1) rein(p + width);
  }
  return binaryImg;
}

// Connected-Components: Bounding-Box der eigentlichen Ziffer (große Komponenten
// vereinigt, kleine Sprenkel ignoriert) — robuster als die rohe Pixel-Bbox.
function zifferRegion(binaryImg) {
  const { data, width, height } = binaryImg.bitmap;
  const ink = i => data[i * 4] > 128;
  const label = new Int32Array(width * height).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < width * height; s++) {
    if (label[s] !== -1 || !ink(s)) continue;
    const id = comps.length;
    let area = 0, minX = width, maxX = 0, minY = height, maxY = 0;
    stack.length = 0; stack.push(s); label[s] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % width, y = (p / width) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0)          { const q = p - 1;     if (label[q] === -1 && ink(q)) { label[q] = id; stack.push(q); } }
      if (x < width - 1)  { const q = p + 1;     if (label[q] === -1 && ink(q)) { label[q] = id; stack.push(q); } }
      if (y > 0)          { const q = p - width; if (label[q] === -1 && ink(q)) { label[q] = id; stack.push(q); } }
      if (y < height - 1) { const q = p + width; if (label[q] === -1 && ink(q)) { label[q] = id; stack.push(q); } }
    }
    comps.push({ area, minX, maxX, minY, maxY });
  }
  if (!comps.length) return null;
  const maxArea = Math.max(...comps.map(c => c.area));
  let minX = width, maxX = 0, minY = height, maxY = 0, inkArea = 0, any = false;
  for (const c of comps) {
    if (c.area >= Math.max(3, maxArea * 0.12)) {
      any = true;
      inkArea += c.area;
      if (c.minX < minX) minX = c.minX; if (c.maxX > maxX) maxX = c.maxX;
      if (c.minY < minY) minY = c.minY; if (c.maxY > maxY) maxY = c.maxY;
    }
  }
  return any ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, inkArea } : null;
}

async function erkennZiffer(jimpImg) {
  const ort = require("onnxruntime-node");
  const Jimp = require("jimp");
  const session = await holeMnistSession();

  const cropB64 = await jimpImg.clone().getBase64Async(Jimp.MIME_PNG);

  const grau = jimpImg.clone().greyscale();
  const schwelle = otsuSchwellwert(grau);
  const bin = grau.threshold({ max: schwelle }).invert();
  entferneRahmen(bin);  // gedruckte Kästchen-Ränder raus, bevor MNIST sie als Ziffer liest

  // Leer-Erkennung: zu wenig Tinte = leere Box
  const ink = inkRatio(bin);
  if (ink < 0.006) {
    return { digit: null, conf: 0, sampleId: null, leer: true };
  }

  // Ziffer MNIST-konform aufbereiten: größte Komponente auf 20px skalieren,
  // zentriert in ein 28×28-Feld setzen (so wurde MNIST trainiert).
  const region = zifferRegion(bin);
  // Solidity-Check: ein fast voll gefüllter Block (z.B. schwarzes Restquadrat)
  // ist keine Ziffer → als leer behandeln statt zu raten. Ziffern haben Lücken
  // (Solidity ~0.3–0.7), ein gefüllter Block ~1.0.
  if (region) {
    const solidity = region.inkArea / (region.w * region.h);
    const flaeche = (region.w * region.h) / (bin.bitmap.width * bin.bitmap.height);
    if (solidity > 0.85 && flaeche > 0.18) return { digit: null, conf: 0, sampleId: null, leer: true };
  }
  let img;
  if (region && region.w >= 2 && region.h >= 2) {
    const ziffer = bin.clone().crop(region.x, region.y, region.w, region.h);
    const scale = 20 / Math.max(region.w, region.h);
    const dw = Math.max(1, Math.round(region.w * scale));
    const dh = Math.max(1, Math.round(region.h * scale));
    ziffer.resize(dw, dh);
    const canvas = new Jimp(28, 28, 0x000000ff);
    canvas.composite(ziffer, Math.round((28 - dw) / 2), Math.round((28 - dh) / 2));
    img = canvas;
  } else {
    img = bin.clone().resize(28, 28);
  }

  const { data } = img.bitmap;
  const input = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) input[i] = data[i * 4] / 255;

  // DB-Abgleich: bestätigte Korrekturen bevorzugen
  const dbTreffer = await zifferAusDbSuchen(input);
  if (dbTreffer) {
    console.log(`    DB-Treffer: ${dbTreffer.ziffer} (sim=${dbTreffer.sim.toFixed(3)})`);
    return { digit: dbTreffer.ziffer, conf: dbTreffer.sim, sampleId: dbTreffer.id };
  }

  const tensor = new ort.Tensor("float32", input, [1, 1, 28, 28]);
  const out = await session.run({ [session.inputNames[0]]: tensor });
  const scores = Array.from(out[session.outputNames[0]].data);
  const maxS = Math.max(...scores);
  const exps = scores.map(x => Math.exp(x - maxS));
  const sum = exps.reduce((a, b) => a + b);
  const probs = exps.map(x => x / sum);
  const digit = probs.indexOf(Math.max(...probs));
  const conf = probs[digit];

  const sampleId = await zifferInDbSpeichern(input, digit, conf, cropB64);
  return { digit, conf, sampleId };
}

// Zwei separate Boxen (Zehner + Einer) — Leer-Erkennung steckt in erkennZiffer
async function erkennPunktzahl(zehnerImg, einerImg) {
  const z = await erkennZiffer(zehnerImg);
  const e = await erkennZiffer(einerImg);
  if (z.leer && e.leer) return { punkte: null, zweistellig: false, sampleIds: [] };
  if (!z.leer && !e.leer) {
    console.log(`    2-stellig: ${z.digit}(${z.conf.toFixed(2)}) ${e.digit}(${e.conf.toFixed(2)})`);
    // zweistellig=true → beide Boxen gefüllt; führende 0 (z.B. "09") bleibt in der Anzeige
    // erhalten, wichtig für die DB (Zehner-Sample wird mitgeführt).
    return { punkte: z.digit * 10 + e.digit, zweistellig: true, sampleIds: [z.sampleId, e.sampleId].filter(Boolean) };
  }
  // Einstellig: nur die nicht-leere Box zählt
  const aktiv = z.leer ? e : z;
  console.log(`    1-stellig: ${aktiv.digit}(${aktiv.conf.toFixed(2)})`);
  return { punkte: aktiv.digit, zweistellig: false, sampleIds: aktiv.sampleId ? [aktiv.sampleId] : [] };
}

// ─── Supabase Lernfunktion ────────────────────────────────
const { createClient } = require("@supabase/supabase-js");
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
} else {
  console.warn("Supabase nicht konfiguriert – OCR-Lernfunktion deaktiviert.");
}

function pixelAehnlichkeit(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 784; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// In-Memory-Cache der bestätigten Samples: einmal pro Scan laden (statt pro Ziffer
// die ganze Tabelle übers Netz zu ziehen). Erkennung bleibt identisch — gleiche Daten,
// gleiches Matching, nur einmal geladen. Decodierung 1:1 wie zuvor.
let _sampleCache = null;  // [{id, korrigiert, arr: Float32Array}]

async function ladeSampleCache() {
  if (!supabase) { _sampleCache = []; return; }
  const { data, error } = await supabase
    .from("ziffer_samples")
    .select("id, pixel_data, korrigiert")
    .not("korrigiert", "is", null);
  if (error || !data) { _sampleCache = []; console.log("Sample-Cache: Laden fehlgeschlagen → leer"); return; }
  _sampleCache = data.map(row => ({
    id: row.id,
    korrigiert: row.korrigiert,
    arr: new Float32Array(Buffer.from(row.pixel_data, "base64").buffer),
  }));
  console.log(`Sample-Cache geladen: ${_sampleCache.length} bestätigte Samples`);
}

async function zifferAusDbSuchen(pixelData) {
  if (!_sampleCache) await ladeSampleCache();  // Fallback, falls nicht vorgeladen
  const FRUEH_AUS = 0.99;  // ab quasi-pixelgleich: sofort abbrechen, Rest sparen
  let best = null, bestSim = 0;
  for (const row of _sampleCache) {
    const sim = pixelAehnlichkeit(pixelData, row.arr);
    if (sim > bestSim) { bestSim = sim; best = row; }
    if (sim >= FRUEH_AUS) break;  // Early-Exit: ein so hoher Treffer ist zuverlässig
  }
  return bestSim > 0.97 ? { ziffer: best.korrigiert, sim: bestSim, id: best.id } : null;
}

async function zifferInDbSpeichern(pixelData, mnistDigit, konfidenz, cropB64) {
  if (!supabase) return null;
  const pixel_data = Buffer.from(pixelData.buffer).toString("base64");
  const { data, error } = await supabase
    .from("ziffer_samples")
    .insert({ pixel_data, mnist_digit: mnistDigit, konfidenz, crop_b64: cropB64 ?? null })
    .select("id")
    .single();
  if (error) { console.error("Supabase insert:", error.message); return null; }
  return data.id;
}

// ─── ENDPUNKT: Ziffer-Korrektur speichern ─────────────────
app.post("/api/ocr/korrektur", async (req, res) => {
  const { sampleId, ziffer } = req.body;
  if (sampleId == null || ziffer == null) return res.status(400).json({ fehler: "sampleId und ziffer erforderlich" });
  if (!supabase) return res.status(503).json({ fehler: "Supabase nicht konfiguriert" });
  const { error } = await supabase
    .from("ziffer_samples")
    .update({ korrigiert: Number(ziffer) })
    .eq("id", Number(sampleId));
  if (error) return res.status(500).json({ fehler: error.message });
  res.json({ ok: true });
});

// ─── ENDPUNKT: Alle gespeicherten Samples abrufen ─────────
app.get("/api/ocr/samples", async (req, res) => {
  if (!supabase) return res.json([]);
  const { data, error } = await supabase
    .from("ziffer_samples")
    .select("id, mnist_digit, korrigiert, konfidenz, crop_b64")
    .order("id", { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ fehler: error.message });
  res.json(data);
});

// ─── ENDPUNKT: Alle Samples löschen (Test/Reset) ──────────
// Leert die ziffer_samples-Tabelle komplett. Supabase verlangt eine Filter-Bedingung
// für delete → gt("id", 0) trifft alle Zeilen (ids sind positive Serials).
app.delete("/api/ocr/samples", async (req, res) => {
  if (!supabase) return res.status(503).json({ fehler: "Supabase nicht konfiguriert" });
  const { error, count } = await supabase
    .from("ziffer_samples")
    .delete({ count: "exact" })
    .gt("id", 0);
  if (error) return res.status(500).json({ fehler: error.message });
  console.log(`Samples-DB geleert: ${count ?? "?"} Zeilen gelöscht`);
  res.json({ ok: true, geloescht: count ?? null });
});

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

// ─── Notenschlüssel einer Prüfung laden ───────────────────
app.get("/api/pruefungen/:id/notenschluessel", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/notenschluessel/pruefung/${req.params.id}`);
    if (response.status === 404) return res.status(404).json(null);
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ fehler: "DB nicht erreichbar." });
  }
});

// ─── Notenschlüssel einer Prüfung speichern ───────────────
app.put("/api/pruefungen/:id/notenschluessel", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/notenschluessel/pruefung/${req.params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await parseDbResponse(response);
    res.status(response.status).json(data);
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

// ─── Prüfung löschen ──────────────────────────────────────
app.delete("/api/pruefungen/:id", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/pruefungen/${req.params.id}`, {
      method: "DELETE",
    });
    if (response.status === 204 || response.status === 200) {
      res.status(204).end();
    } else {
      const data = await parseDbResponse(response);
      res.status(response.status).json(data);
    }
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
    const response = await fetch(`${DB_URL}/aufgaben/pruefung/${req.params.id}`);
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

// ─── Seiten-Entzerrung via ArUco-Eckmarker (OpenCV / aruco_warp.py) ──────────
// Das Template trägt in den vier Ecken ArUco-Marker (DICT_4X4_50, IDs 0..3 = TL,TR,
// BL,BR). Das Python-Skript findet sie und entzerrt die Seite per Homographie auf
// festes A4 (1440×2037, 1mm = fester Pixelwert). Pro Seite ein kurzer execFile-Aufruf
// – kein Dauer-Server, kein Port. Bei Fehlschlag (zu wenige Marker) → null, der
// Aufrufer nimmt dann das Rohbild (Feld-Anker-Erkennung kann es trotzdem versuchen).
async function entzerrePerAruco(buf) {
  const tmp = os.tmpdir();
  const id = `pscan-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inPath = path.join(tmp, `${id}-in.png`);
  const outPath = path.join(tmp, `${id}-out.png`);
  try {
    await fs.promises.writeFile(inPath, buf);
    const { stdout } = await execFileP(
      "python3",
      [path.join(__dirname, "aruco_warp.py"), "warp", inPath, outPath],
      { timeout: 20000 }
    );
    let res = {};
    try { res = JSON.parse(stdout.trim().split("\n").pop()); } catch {}
    if (res.ok) {
      const tasks = res.tasks || [];
      console.log(`ArUco-Entzerrung: ${res.n} Eck-Marker ${JSON.stringify(res.ids)} → A4` + (tasks.length ? `, ${tasks.length} Aufgaben-Marker` : ""));
      const Jimp = require("jimp");
      return { bild: await Jimp.read(outPath), tasks };
    }
    console.log(`ArUco-Entzerrung fehlgeschlagen (${res.err || "unbekannt"}) → Rohbild`);
    return null;
  } catch (e) {
    console.log(`ArUco-Entzerrung Fehler: ${e.message} → Rohbild`);
    return null;
  } finally {
    fs.promises.unlink(inPath).catch(() => {});
    fs.promises.unlink(outPath).catch(() => {});
  }
}

// ─── Anker-Marken erkennen (solide schwarze Quadrate aufs Template gedruckt) ──
// Statt dünne Rahmen oder Handschrift zu detektieren, druckt das Template an jeder
// OCR-Stelle ein solides schwarzes Quadrat (Anker). Diese sind trivial+robust zu
// finden: vollflächige, quadratische Dunkel-Blobs der erwarteten Größe.
// Connected-Components im Bereich [x0..x1]×[y0..y1], gibt passende Blobs zurück.
function findeAnkerBlobs(data, W, H, x0, y0, x1, y1, ankerPx) {
  const dark = i => data[i * 4] < 100;
  const seen = new Uint8Array(W * H);
  const blobs = [];
  const lo = ankerPx * 0.5, hi = ankerPx * 2.0;
  const stack = [];
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      const s = yy * W + xx;
      if (seen[s] || !dark(s)) continue;
      let minX = xx, maxX = xx, minY = yy, maxY = yy, area = 0;
      stack.length = 0; stack.push(s); seen[s] = 1;
      while (stack.length) {
        const p = stack.pop(); const px = p % W, py = (p / W) | 0; area++;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (px > 0)     { const q = p - 1; if (!seen[q] && dark(q)) { seen[q] = 1; stack.push(q); } }
        if (px < W - 1) { const q = p + 1; if (!seen[q] && dark(q)) { seen[q] = 1; stack.push(q); } }
        if (py > 0)     { const q = p - W; if (!seen[q] && dark(q)) { seen[q] = 1; stack.push(q); } }
        if (py < H - 1) { const q = p + W; if (!seen[q] && dark(q)) { seen[q] = 1; stack.push(q); } }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      const fill = area / (bw * bh);
      // solide (gefüllt), quadratisch, erwartete Größe
      if (bw >= lo && bw <= hi && bh >= lo && bh <= hi && fill > 0.72 && bw / bh > 0.55 && bw / bh < 1.8) {
        blobs.push({ x: minX, y: minY, w: bw, h: bh, x2: maxX, xc: (minX + maxX) / 2, yc: (minY + maxY) / 2 });
      }
    }
  }
  return blobs;
}

// Aus mehreren Anker-Blobs die dominante vertikale Spalte herausgreifen
// (gleiche X, eine pro Aufgabe), nach Y sortiert.
function ankerSpalte(blobs) {
  if (!blobs.length) return [];
  let best = [];
  for (const b of blobs) {
    const grp = blobs.filter(o => Math.abs(o.xc - b.xc) <= 14);
    if (grp.length > best.length) best = grp;
  }
  return best.sort((a, b) => a.yc - b.yc);
}

// ─── Box-Rand-Snap: gedruckten schwarzen Kästchen-Rand exakt finden ──────────
// Aus fester CSS-Geometrie berechnete Boxen driften minimal (Druck/Scan-Skalierung):
// weiter rechts sitzt der echte Rand ein paar px daneben. Hier den tatsächlichen Rand
// nahe der erwarteten Box (ex,ey,ew,eh, Außenmaße) suchen und den Innenraum zurückgeben.
// data = binär (dunkel = data[i*4] < 100). Liefert null, wenn kein plausibler Rand.
function snapBox(data, W, H, ex, ey, ew, eh) {
  const dark = (x, y) => data[(y * W + x) * 4] < 100;
  const ya = Math.max(0, ey + 3), yb = Math.min(H - 1, ey + eh - 3);
  const colDark = x => { let n = 0; for (let y = ya; y <= yb; y++) if (dark(x, y)) n++; return n / (yb - ya + 1); };
  // Linker Rand: ab Gap-Mitte (ex-3) nach rechts die erste vollhohe Linie (≠ Ziffer, die zentraler liegt).
  let left = -1;
  for (let x = Math.max(0, ex - 3); x <= Math.min(W - 1, ex + 12); x++) if (colDark(x) > 0.6) { left = x; break; }
  if (left < 0) return null;
  // Rechter Rand: nur in Box-Breite rechts vom linken Rand (so wird die nächste Box ausgeschlossen).
  let right = -1;
  for (let x = Math.min(W - 1, left + ew + 2); x >= left + Math.round(ew * 0.6); x--) if (colDark(x) > 0.6) { right = x; break; }
  if (right < 0 || right - left < ew * 0.6) return null;
  const xa = left, xb = right;
  const rowDark = y => { let n = 0; for (let x = xa; x <= xb; x++) if (dark(x, y)) n++; return n / (xb - xa + 1); };
  let topB = -1, botB = -1;
  for (let y = Math.max(0, ey - 3); y <= Math.min(H - 1, ey + 12); y++) if (rowDark(y) > 0.6) { topB = y; break; }
  for (let y = Math.min(H - 1, ey + eh + 3); y >= ey + Math.round(eh * 0.6); y--) if (rowDark(y) > 0.6) { botB = y; break; }
  if (topB < 0 || botB < 0 || botB - topB < eh * 0.6) return null;
  const pad = 3;  // knapp innerhalb des erkannten Rands
  return { x: left + pad, y: topB + pad, w: (right - left) - 2 * pad, h: (botB - topB) - 2 * pad };
}

// ─── ENDPUNKT 11 ──────────────────────────────────────────
// OCR: Klausurseiten scannen → Matrikelnummer + Punkte extrahieren
// MNIST-basiert: kein Tesseract, kein externer API-Aufruf
app.post("/api/ocr/scan", upload.array("dateien", 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ fehler: "Keine Dateien hochgeladen." });
  }

  // console.log dieses Requests mitschneiden → als logs[] an die Testseite zurückgeben
  // (Terminal-Ausgabe bleibt erhalten). In finally wieder herstellen.
  const logs = [];
  const origLog = console.log;
  console.log = (...a) => { origLog(...a); logs.push(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); };

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

    // Template-Koordinaten bei 1440px Breite (1 CSS px = 1.814 scan px, 1mm = 6.857 scan px)
    const TW          = 1440;
    // Aufgaben-Boxen: zwei separate Boxen (Zehner + Einer), je 26 CSS px breit, Gap 5 CSS px
    const OCR_L_Z     = 1190;  // linke Kante ocrdigit-z (Zehner)
    const OCR_L_E     = 1246;  // linke Kante ocrdigit-e (Einer): 1190 + 26×1.814 + 5×1.814
    const OCR_W_BOX   = 35;    // Breite innerer Crop: 26px × 1.814 − 2×INSET = 47 − 12 = 35
    const OCR_H       = 91;    // Höhe ocrdigit (50 CSS px × 1.814)
    const INSET       = 6;     // Einzug vom Boxrahmen (border=2.5px CSS × 1.814 ≈ 4.5px scan)
    // Matrikel-Boxen: 8 einzelne Boxen, je 30 CSS px breit, Gap 3 CSS px
    const MAT_BOX_X0  = 958;   // scan-X linke Kante erste Matrikelbox
    const MAT_BOX_W   = 50;    // Breite (30 CSS px × 1.814 − border)
    const MAT_BOX_H   = 65;    // Höhe (36 CSS px × 1.814)
    const MAT_BOX_DX  = 60;    // Abstand Box-zu-Box (30px + 3px Gap) × 1.814
    const MAT_BOX_Y0  = 225;   // Y-Mitte der Matrikelboxen im Header
    // Anker-Marken (solide schwarze Quadrate 5mm, mit 2.5mm margin-right links der Boxen)
    const PXMM          = 6.857;  // scan-px pro mm (1440px / 210mm A4)
    const CSSPX         = 1.814;  // scan-px pro CSS-px
    const ANKER_PX      = Math.round(5 * PXMM);                      // ~34: Kantenlänge Anker-Quadrat
    // Abstand Anker-Rechtskante → Box-Linkskante = flex-gap + margin-right(2.5mm)
    const ANKER_GAP_AUF = Math.round(2.5 * PXMM + 5 * CSSPX);        // ~26: .ocr hat gap:5px
    const ANKER_GAP_MAT = Math.round(2.5 * PXMM + 3 * CSSPX);        // ~22: .matdigits hat gap:3px

    function findeBoxPositionen(bild) {
      const thresh = bild.clone().threshold({ max: 80 });
      const { width, height, data } = thresh.bitmap;

      // Primär: linker schwarzer Balken von .apkt (4px solid #000)
      // Liegt rechnerisch bei x≈1142, Scanner-Offset ±60px → Bereich 1080–1200
      let besteRuns = [];
      let bestX = -1;
      for (let x = 1080; x <= 1200; x += 3) {
        const runs = scanSpalte(data, width, height, x, 80, 350);
        if (runs.length > besteRuns.length) {
          besteRuns = runs;
          bestX = x;
        }
      }
      if (besteRuns.length >= 1) {
        console.log(`  Balken-Methode: ${besteRuns.length} Aufgaben bei x=${bestX}`);
        return { positionen: besteRuns.map(r => ({ y0: r.y0, y1: r.y1 })), bestX };
      }

      // Fallback: Boxrahmen-Scan an der OCR-Box-Kante
      for (let x = 1185; x <= 1230; x += 3) {
        const runs = scanSpalte(data, width, height, x, 60, 120);
        if (runs.length >= 1) {
          console.log(`  Rahmen-Methode (Fallback): ${runs.length} Boxen bei x=${x}`);
          return { positionen: runs, bestX: -1 };
        }
      }

      console.log("  Keine Boxen gefunden");
      return { positionen: [], bestX: -1 };
    }

    let matrikelnummer = null;
    let matrikelCrops = [];
    let matrikelSampleIds = [];
    const aufgaben = [];
    let aufgabeCounter = 0;  // globaler Zähler über alle Seiten
    let seitenIdx = 0;
    const debugOverlays = [];

    // Bestätigte Samples EINMAL pro Scan laden (statt pro Ziffer) → schnell, immer frisch.
    _sampleCache = null;
    await ladeSampleCache();

    const bildBuffers = await dateienZuBildBuffern(req.files);
    if (!bildBuffers.length) return res.status(400).json({ fehler: "Keine lesbaren Seiten gefunden." });

    const A4_H = Math.round(TW * 297 / 210);   // 1440 → 2037
    for (const buf of bildBuffers) {
      // Primär: ArUco-Eckmarker → Homographie-Entzerrung auf festes A4 (Python/OpenCV).
      // Liefert ein fertiges 1440×2037-Bild, in dem jeder mm an fester Pixelposition liegt.
      const entzerrt = await entzerrePerAruco(buf);
      let original, taskMarker = [];
      if (entzerrt) {
        original = entzerrt.bild;
        taskMarker = entzerrt.tasks;   // [{id, nr, x, y}] – gedruckte Aufgaben-Marker im A4-Raster
      } else {
        // Fallback ohne erkannte Marker: Rohbild aufs A4-Raster ziehen. Die Feld-Anker-
        // Erkennung unten versucht es trotzdem (unsicherer, da nicht entzerrt).
        original = (await Jimp.read(buf)).resize(TW, A4_H);
        console.log("Kein ArUco-Ergebnis → Rohbild auf A4 skaliert (Felderkennung unsicherer)");
      }
      const { width: W, height: H } = original.bitmap;
      console.log(`Normalisiert: ${W}x${H} (A4-fix)`);

      // Debug-Overlay: zeigt was der Detektor sieht (Suchfenster, Anker, Box-Crops).
      const dbgImg = original.clone();
      const dbgRect = (img, x, y, w, h, color, t = 2) => {
        const bw = img.bitmap.width, bh = img.bitmap.height;
        x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
        for (let i = 0; i < t; i++) {
          for (let xx = x; xx < x + w; xx++) {
            if (xx < 0 || xx >= bw) continue;
            if (y + i >= 0 && y + i < bh) img.setPixelColor(color, xx, y + i);
            if (y + h - 1 - i >= 0 && y + h - 1 - i < bh) img.setPixelColor(color, xx, y + h - 1 - i);
          }
          for (let yy = y; yy < y + h; yy++) {
            if (yy < 0 || yy >= bh) continue;
            if (x + i >= 0 && x + i < bw) img.setPixelColor(color, x + i, yy);
            if (x + w - 1 - i >= 0 && x + w - 1 - i < bw) img.setPixelColor(color, x + w - 1 - i, yy);
          }
        }
      };
      const DBG = { blau: 0x2D6CFFFF, gruen: 0x16C60CFF, magenta: 0xE000E0FF, orange: 0xFF8C00FF, rot: 0xFF0000FF, cyan: 0x00C8C8FF, lila: 0xB000FFFF };

      const fuerCrops = original.clone().greyscale().normalize().contrast(0.5);
      // Binärbild für Box-Rahmen-Detektion (vertikale Position der ocrdigit-Box)
      const detThresh = fuerCrops.clone().threshold({ max: 90 });
      const dT = detThresh.bitmap.data;

      // ── 1. Matrikelnummer: 8 Boxen aus Anker-Marke ableiten ────────────
      if (!matrikelnummer) {
        // 1a) Primär: Anker-Quadrat links der Matrikelboxen im Kopfbereich
        let matBoxen = null;
        // Suchfenster eng: Matrikel-Anker liegt (bei exakter A4-Entzerrung) im Kopf
        // bei x≈0.54W, y≈0.09H. Rechts auf 0.72W begrenzen, sonst wird der ArUco-Eckmarker
        // oben rechts (x≈0.93W, größer als der 5mm-Anker) fälschlich als Anker gewählt.
        const matX0 = Math.round(W * 0.45), matX1 = Math.round(W * 0.72), matY1 = Math.round(H * 0.15);
        // Anker-Suche nur bis matX1 (0.72W, hält den ArUco-Eckmarker draußen); das blaue
        // Viz-Rechteck reicht weiter nach rechts (0.91W), damit es die 8 Matrikelboxen mit abdeckt.
        const matWin = { x: matX0, y: 0, w: Math.round(W * 0.91) - matX0, h: matY1 };
        dbgRect(dbgImg, matWin.x, matWin.y, matWin.w, matWin.h, DBG.blau, 2);   // Matrikel-Suchfenster
        const matAnkerKand = findeAnkerBlobs(dT, W, H, matX0, 0, matX1, matY1, ANKER_PX);
        for (const b of matAnkerKand) dbgRect(dbgImg, b.x, b.y, b.w, b.h, DBG.cyan, 1);  // alle Kandidaten
        if (matAnkerKand.length) {
          matAnkerKand.sort((a, b) => (b.w * b.h) - (a.w * a.h));  // größtes solides Quadrat = Anker
          const A = matAnkerKand[0];
          const box0L = A.x2 + ANKER_GAP_MAT;
          const top = Math.round(A.yc - MAT_BOX_H / 2);
          // Pro Kästchen den echten schwarzen Rand finden (snapBox) und exakt hineincroppen
          // → korrigiert Pitch-Drift (Boxen 4–8 saßen minimal versetzt) und liefert den
          // KOMPLETTEN Innenraum. Fallback: feste Geometrie mit Rahmendicke-Einschnitt.
          const MAT_CELL_W = MAT_BOX_DX - Math.round(3 * CSSPX);  // Box-Außenbreite (Pitch − 3px-Gap)
          const matIns = Math.round(2.5 * CSSPX);                // ~5px = Rahmendicke
          matBoxen = [];
          for (let k = 0; k < 8; k++) {
            const l = box0L + k * MAT_BOX_DX;
            const snapped = snapBox(dT, W, H, l, top, MAT_CELL_W, MAT_BOX_H);
            matBoxen.push(snapped || { x: l + matIns, y: top + matIns, w: MAT_CELL_W - 2 * matIns, h: MAT_BOX_H - 2 * matIns });
          }
          dbgRect(dbgImg, A.x, A.y, A.w, A.h, DBG.gruen, 2);   // gewählter Matrikel-Anker
          console.log(`Matrikel-Anker bei x=${Math.round(A.xc)} y=${Math.round(A.yc)} → box0L=${box0L}`);
        }
        // 1b) Fallback (altes Blatt ohne Anker): feste Koordinaten
        if (!matBoxen) console.log("Matrikel: kein Anker gefunden → feste Koordinaten (bitte Template neu drucken)");

        const ziffern = [];
        const crops = [];
        const sampleIds = [];
        for (let k = 0; k < 8; k++) {
          let bx, by, bw, bh;
          if (matBoxen) {
            ({ x: bx, y: by, w: bw, h: bh } = matBoxen[k]);
          } else {
            bx = MAT_BOX_X0 + k * MAT_BOX_DX;
            by = Math.max(0, MAT_BOX_Y0 - Math.floor(MAT_BOX_H / 2));
            bw = MAT_BOX_W;
            bh = MAT_BOX_H;
          }
          bw = Math.min(bw, W - bx);
          bh = Math.min(bh, H - by);
          if (bx < 0 || by < 0 || bw <= 0 || bh <= 0) { ziffern.push(null); crops.push(null); sampleIds.push(null); continue; }
          dbgRect(dbgImg, bx, by, bw, bh, matBoxen ? DBG.magenta : DBG.rot, 1);   // Matrikel-Crop k
          const box = fuerCrops.clone().crop(bx, by, bw, bh);
          const cropB64 = await box.clone().resize(60, 60).getBase64Async(Jimp.MIME_PNG);
          crops.push(cropB64);
          const ziffer = await erkennZiffer(box);
          console.log(`  Matrikel[${k}]: ${ziffer.digit} (conf=${ziffer.conf.toFixed(2)})`);
          ziffern.push(ziffer.conf > 0.3 ? ziffer.digit : null);
          sampleIds.push(ziffer.sampleId ?? null);
        }
        matrikelnummer = ziffern.map(z => z !== null ? String(z) : "?").join("");
        matrikelCrops = crops;
        matrikelSampleIds = sampleIds;
        console.log(`Matrikelnummer: ${matrikelnummer}`);
      }

      // ── 2. Aufgaben-OCR-Stellen lokalisieren ─────────────────────────
      // Crop-Rechtecke je Aufgabe bestimmen: {zL,zW,eL,eW,cropT,cropCH,previewL,previewW,dbg}
      const taskRects = [];
      if (taskMarker.length) {
        // 2a) Primär: Boxen relativ zum ArUco-Aufgaben-Marker (Marker = Position + Nummer,
        //     kein schwarzes Anker-Quadrat mehr nötig). Marker sitzt mittig in der Punktespalte
        //     ÜBER den OCR-Boxen; die zwei Boxen straddeln m.x.
        const BOX_OUTER = Math.round(26 * CSSPX);                     // ~47: Box-Außenbreite (26 CSS px)
        const BOX_GAP   = Math.round(5 * CSSPX);                      // ~9: Gap z↔e
        const PAIR_HALF = Math.round((2 * BOX_OUTER + BOX_GAP) / 2);  // ~52: halbe Box-Paar-Breite
        const MARK_TOP  = Math.round(3 * PXMM + 5 * CSSPX);           // ~30: Marker-Mitte → Box-Oberkante (Marker-Bild 6mm + 5px Gap)
        console.log(`Aufgaben über ${taskMarker.length} ArUco-Marker`);
        for (const m of [...taskMarker].sort((a, b) => a.y - b.y)) {
          dbgRect(dbgImg, Math.round(m.x - 12), Math.round(m.y - 12), 24, 24, DBG.lila, 2);   // Marker-Position
          const boxTop = Math.round(m.y + MARK_TOP);
          const zOut = Math.round(m.x - PAIR_HALF);
          const eOut = zOut + BOX_OUTER + BOX_GAP;
          taskRects.push({
            aufgabeNr: m.nr,
            zL: zOut + INSET, zW: OCR_W_BOX,
            eL: eOut + INSET, eW: OCR_W_BOX,
            cropT: Math.max(0, boxTop + INSET),
            cropCH: Math.max(10, Math.min(OCR_H - 2 * INSET, H - Math.max(0, boxTop + INSET))),
            previewL: zOut,
            previewW: (eOut + BOX_OUTER) - zOut,
            dbg: `marker nr=${m.nr} mx=${Math.round(m.x)} my=${Math.round(m.y)}`,
          });
        }
      } else {
      // 2b) Fallback (alte Blätter ohne Marker): Anker-Spalte (solides Quadrat) / Balken.
      const aufWin = { x: Math.round(W * 0.65), y: Math.round(H * 0.13), w: W - 1 - Math.round(W * 0.65), h: H - 1 - Math.round(H * 0.13) };
      dbgRect(dbgImg, aufWin.x, aufWin.y, aufWin.w, aufWin.h, DBG.blau, 2);   // Aufgaben-Suchfenster
      const aufKand = findeAnkerBlobs(dT, W, H, Math.round(W * 0.65), Math.round(H * 0.13), W - 1, H - 1, ANKER_PX);
      for (const b of aufKand) dbgRect(dbgImg, b.x, b.y, b.w, b.h, DBG.cyan, 1);  // alle Kandidaten
      const aufAnker = ankerSpalte(aufKand);
      if (aufAnker.length) {
        console.log(`Aufgaben-Anker: ${aufAnker.length} in Spalte x≈${Math.round(aufAnker[0].xc)}`);
        for (const A of aufAnker) {
          dbgRect(dbgImg, A.x, A.y, A.w, A.h, DBG.gruen, 2);   // gewählter Aufgaben-Anker
          const box0L = A.x2 + ANKER_GAP_AUF;             // linke Kante ocrdigit-z
          const top   = Math.round(A.yc - OCR_H / 2);     // Box vertikal auf Anker zentriert
          // Aufgaben-Nummer aus dem nächsten ArUco-Marker (per Y) – robust gegen Reihenfolge/
          // verpasste Anker. Fallback (null) → Aufrufer zählt durch.
          let aufgabeNr = null;
          if (taskMarker.length) {
            const m = taskMarker.reduce((b, t) => Math.abs(t.y - A.yc) < Math.abs(b.y - A.yc) ? t : b);
            if (Math.abs(m.y - A.yc) < 90) aufgabeNr = m.nr;
          }
          taskRects.push({
            aufgabeNr,
            zL: box0L + INSET, zW: OCR_W_BOX,
            eL: box0L + 56 + INSET, eW: OCR_W_BOX,        // +56 = Box-Pitch z→e
            cropT: Math.max(0, top + INSET),
            cropCH: Math.max(10, Math.min(OCR_H - 2 * INSET, H - Math.max(0, top + INSET))),
            previewL: box0L,
            previewW: (box0L + 56 + OCR_W_BOX + INSET) - box0L,
            dbg: `anker y=${Math.round(A.yc)} nr=${aufgabeNr ?? "?"}`,
          });
        }
      } else {
        // 2b) Fallback: APKT-Balken + horizontale Rahmenlinien (alte Methode)
        const { positionen: boxPositionen, bestX: detBestX } = findeBoxPositionen(fuerCrops);
        const lz = detBestX > 0 ? detBestX + 47 : OCR_L_Z;
        const le = detBestX > 0 ? detBestX + 103 : OCR_L_E;
        console.log(`Aufgaben-Fallback (Balken): ${boxPositionen.length} | x=${detBestX} → Z=${lz} E=${le}`);
        for (const { y0: boxTop, y1: boxBottom } of boxPositionen) {
          const xa = Math.max(0, lz - 2), xb = Math.min(W - 1, le + OCR_W_BOX + 2);
          const boxSpanW = Math.max(1, xb - xa + 1);
          const zeileVoll = y => { let n = 0; for (let x = xa; x <= xb; x++) if (dT[(y * W + x) * 4] < 100) n++; return n / boxSpanW > 0.45; };
          const vollZeilen = [];
          for (let y = Math.max(0, boxTop - 12); y <= Math.min(H - 1, boxBottom + 12); y++) if (zeileVoll(y)) vollZeilen.push(y);
          let bTop = -1, bBot = -1;
          if (vollZeilen.length >= 2) {
            bBot = vollZeilen[vollZeilen.length - 1];
            for (const y of vollZeilen) if (bBot - y >= 55 && bBot - y <= 120) { bTop = y; break; }
          }
          let cropT, cropCH;
          if (bTop >= 0) { cropT = Math.max(0, bTop + INSET); cropCH = Math.max(10, Math.min((bBot - bTop) - 2 * INSET, H - cropT)); }
          else { cropT = Math.max(0, boxBottom - OCR_H - 18); cropCH = Math.max(10, Math.min(OCR_H - 2 * INSET, boxBottom - cropT, H - cropT)); }
          taskRects.push({
            zL: lz + INSET, zW: OCR_W_BOX, eL: le + INSET, eW: OCR_W_BOX,
            cropT, cropCH, previewL: lz, previewW: (le + OCR_W_BOX + INSET) - lz,
            dbg: bTop >= 0 ? `linie[${bTop}-${bBot}]` : `bar-fallback`,
          });
        }
      }
      }

      // ── 3. Jede Aufgabe per MNIST erkennen (Zehner + Einer getrennt) ──
      for (const r of taskRects) {
        aufgabeCounter++;
        // ArUco-Marker-Nummer bevorzugen (robust gegen Reihenfolge/verpasste Anker); sonst durchzählen.
        const aufgabeNr = r.aufgabeNr ?? aufgabeCounter;
        const zL = Math.max(0, r.zL), zW = Math.max(5, Math.min(r.zW, W - zL));
        const eL = Math.max(0, r.eL), eW = Math.max(5, Math.min(r.eW, W - eL));
        const zehnerImg = fuerCrops.clone().crop(zL, r.cropT, zW, r.cropCH);
        const einerImg  = fuerCrops.clone().crop(eL, r.cropT, eW, r.cropCH);
        dbgRect(dbgImg, zL, r.cropT, zW, r.cropCH, DBG.rot, 1);       // Zehner-Crop
        dbgRect(dbgImg, eL, r.cropT, eW, r.cropCH, DBG.orange, 1);    // Einer-Crop
        const previewL = Math.max(0, r.previewL), previewW = Math.max(5, Math.min(r.previewW, W - previewL));
        const cropB64 = await fuerCrops.clone().crop(previewL, r.cropT, previewW, r.cropCH).getBase64Async(Jimp.MIME_PNG);

        console.log(`  A${aufgabeNr}${r.aufgabeNr ? "(marker)" : "(gezählt)"}: ${r.dbg} cropT=${r.cropT} cropH=${r.cropCH}`);
        const { punkte, zweistellig, sampleIds: boxSampleIds } = await erkennPunktzahl(zehnerImg, einerImg);
        // Anzeige-Text mit führender 0 bei zweistelligem Wert (z.B. "09"); Punktwert bleibt numerisch.
        const erreichterText = punkte == null ? null : (zweistellig ? String(punkte).padStart(2, "0") : String(punkte));
        console.log(`  A${aufgabeNr}: → ${erreichterText ?? punkte}`);
        aufgaben.push({ aufgabeNr, bezeichnung: `Aufgabe ${aufgabeNr}`, erreichterPunkte: punkte, erreichterText, sampleIds: boxSampleIds ?? [], cropPreview: cropB64 });
      }

      // Debug-Overlay dieser Seite speichern (Datei für lokale Inspektion + Base64 im Response).
      // Legende: blau=Suchfenster, cyan=Anker-Kandidaten, grün=gewählter Anker,
      //          magenta=Matrikel-Crop(Anker)/rot=Fallback, rot=Zehner, orange=Einer.
      seitenIdx++;
      try {
        const datei = path.join(__dirname, `debug-overlay-seite${seitenIdx}.png`);
        await dbgImg.writeAsync(datei);
        console.log(`Debug-Overlay gespeichert: ${datei}`);
      } catch (e) {
        console.log(`Debug-Overlay konnte nicht gespeichert werden: ${e.message}`);
      }
      debugOverlays.push(await dbgImg.getBase64Async(Jimp.MIME_PNG));
    }

    aufgaben.sort((a, b) => a.aufgabeNr - b.aufgabeNr);
    res.json({ matrikelnummer, matrikelCrops, matrikelSampleIds, aufgaben, debugOverlays, logs });
  } catch (err) {
    console.error("OCR-Fehler stack:", err.stack);
    console.error("OCR-Fehler cause:", err.cause);
    res.status(500).json({
      fehler: "OCR-Fehler: " + err.message,
      cause: err.cause?.message ?? err.cause ?? null,
      stack: err.stack?.split("\n").slice(0, 5),
      logs,
    });
  } finally {
    console.log = origLog;
  }
});

const PORT = process.env.PORT || 3000;
// Nur als eigenständiger Prozess lauschen; bei require (Tests) nur exportieren.
if (require.main === module) {
  app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
}

module.exports = { app, entzerrePerAruco, findeAnkerBlobs, ankerSpalte, dateienZuBildBuffern };
