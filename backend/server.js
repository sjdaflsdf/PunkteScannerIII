"use strict";

console.log("SERVER STARTET...");

const express = require("express");
const { pruefungAuswerten } = require("./logik");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API läuft 🚀");
});

app.post("/api/pruefung/auswerten", (req, res) => {
  try {
    const result = pruefungAuswerten(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("API läuft auf http://localhost:3000");
});