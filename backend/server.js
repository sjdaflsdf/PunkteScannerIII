const express = require("express");
const cors = require("cors");
const { pruefungAuswerten, DEFAULT_NOTENSCHLUESSEL } = require("./logik");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/pruefung/auswerten", (req, res) => {
  const { aufgaben, notenschluessel } = req.body;
  const ergebnis = pruefungAuswerten({
    aufgaben,
    notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL
  });
  res.json(ergebnis);
});

app.get("/api/notenschluessel", (req, res) => {
  res.json(DEFAULT_NOTENSCHLUESSEL);
});

app.post("/api/pruefungen/batch", (req, res) => {
  const { pruefungen, notenschluessel } = req.body;
  const ergebnisse = [];
  const fehler = [];
  for (const studi of pruefungen) {
    try {
      const ergebnis = pruefungAuswerten({
        aufgaben: studi.aufgaben,
        notenschluessel: notenschluessel ?? DEFAULT_NOTENSCHLUESSEL,
      });
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