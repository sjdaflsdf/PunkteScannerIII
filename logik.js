"use strict";

/**
 * Standard-Notenschluessel – kompatibel mit NotenschluesselEditor.jsx
 * Felder: note (String, z.B. "1,0"), schwelle (Zahl in %), color (hex)
 * Reihenfolge muss absteigend nach schwelle sein.
 */
const DEFAULT_NOTENSCHLUESSEL = [
  { note: "1,0", schwelle: 95, color: "#4CAF50" },
  { note: "1,3", schwelle: 90, color: "#4CAF50" },
  { note: "1,7", schwelle: 85, color: "#66BB6A" },
  { note: "2,0", schwelle: 80, color: "#8BC34A" },
  { note: "2,3", schwelle: 75, color: "#8BC34A" },
  { note: "2,7", schwelle: 70, color: "#AED581" },
  { note: "3,0", schwelle: 65, color: "#FF9800" },
  { note: "3,3", schwelle: 60, color: "#FF9800" },
  { note: "3,7", schwelle: 55, color: "#FFA726" },
  { note: "4,0", schwelle: 50, color: "#F44336" },
  { note: "5,0", schwelle: 0,  color: "#B71C1C" },
];

/**
 * Prüft und sortiert den Notenschlüssel.
 * Akzeptiert das Frontend-Format: { note: "1,0", schwelle: 90, color: "..." }
 * ODER das interne Format:        { grade: 1.0, minPercent: 90 }
 * Gibt immer das Frontend-Format zurück.
 */
function normalizeNotenschluessel(schluessel) {
  if (!Array.isArray(schluessel) || schluessel.length === 0) {
    throw new Error("notenschluessel muss ein nicht-leeres Array sein.");
  }

  const normalized = schluessel.map((eintrag) => {
    if (!eintrag) throw new Error("Ungültiger Notenschlüssel-Eintrag.");

    // Internes Format { grade, minPercent } → Frontend-Format umwandeln
    if (typeof eintrag.grade === "number" && typeof eintrag.minPercent === "number") {
      return {
        note: eintrag.grade.toFixed(1).replace(".", ","),
        schwelle: eintrag.minPercent,
        color: eintrag.color ?? "#999",
      };
    }

    // Frontend-Format { note, schwelle }
    if (typeof eintrag.note !== "string" || typeof eintrag.schwelle !== "number") {
      throw new Error(
        "Jeder Eintrag braucht note:string und schwelle:number (oder grade:number und minPercent:number)."
      );
    }

    const schwelle = eintrag.schwelle;
    if (schwelle < 0 || schwelle > 100) {
      throw new Error("schwelle muss zwischen 0 und 100 liegen.");
    }

    return {
      note: eintrag.note,
      schwelle,
      color: eintrag.color ?? "#999",
    };
  });

  // Absteigend nach Schwelle sortieren
  normalized.sort((a, b) => b.schwelle - a.schwelle);
  return normalized;
}

/**
 * Gibt die Note (String, z.B. "2,7") zu einem Prozentwert zurück.
 */
function noteAusProzent(prozent, notenschluessel = DEFAULT_NOTENSCHLUESSEL) {
  if (typeof prozent !== "number" || Number.isNaN(prozent)) {
    throw new Error("prozent muss eine Zahl sein.");
  }

  const schluessel = normalizeNotenschluessel(notenschluessel);
  const begrenzt = Math.max(0, Math.min(100, prozent));

  for (const eintrag of schluessel) {
    if (begrenzt >= eintrag.schwelle) {
      return eintrag.note;
    }
  }

  return schluessel[schluessel.length - 1].note;
}

/**
 * Summiert Punkte einer Prüfung.
 *
 * Erwartet das Frontend-Format aus ErgebnisAnzeige.jsx / ErgebnisPage.jsx:
 * [
 *   { id: 1, name: "Aufgabe 1", punkte: 8,  maxPunkte: 10 },
 *   { id: 2, name: "Aufgabe 2", punkte: 13, maxPunkte: 20 },
 * ]
 *
 * Akzeptiert alternativ auch das interne Format { earnedPoints, maxPoints }.
 */
function berechneSummen(aufgaben) {
  if (!Array.isArray(aufgaben) || aufgaben.length === 0) {
    throw new Error("aufgaben muss ein nicht-leeres Array sein.");
  }

  let erreichteGesamtpunkte = 0;
  let maxGesamtpunkte = 0;

  for (const aufgabe of aufgaben) {
    if (!aufgabe) throw new Error("Ungültige Aufgabe im Array.");

    // Frontend-Format { punkte, maxPunkte }
    const punkte    = aufgabe.punkte    ?? aufgabe.earnedPoints;
    const maxPunkte = aufgabe.maxPunkte ?? aufgabe.maxPoints;

    if (typeof punkte !== "number" || typeof maxPunkte !== "number") {
      throw new Error(
        "Jede Aufgabe braucht punkte:number und maxPunkte:number (oder earnedPoints/maxPoints)."
      );
    }

    if (punkte < 0 || maxPunkte <= 0) {
      throw new Error("punkte >= 0 und maxPunkte > 0 erforderlich.");
    }

    if (punkte > maxPunkte) {
      throw new Error(`punkte (${punkte}) darf maxPunkte (${maxPunkte}) nicht übersteigen.`);
    }

    erreichteGesamtpunkte += punkte;
    maxGesamtpunkte += maxPunkte;
  }

  return { erreichteGesamtpunkte, maxGesamtpunkte };
}

/**
 * Hauptfunktion – wertet eine Prüfung aus.
 *
 * Eingabe:
 *   aufgaben        – Array im Frontend-Format (siehe berechneSummen)
 *   notenschluessel – optional, Standard = DEFAULT_NOTENSCHLUESSEL
 *
 * Rückgabe (kompatibel mit ErgebnisAnzeige.jsx):
 * {
 *   punkte:    number,  // erreichte Gesamtpunkte
 *   maxPunkte: number,  // maximale Gesamtpunkte
 *   prozent:   number,  // gerundeter Prozentwert
 *   note:      string,  // z.B. "2,7"
 *   bestanden: boolean,
 * }
 */
function pruefungAuswerten({ aufgaben, notenschluessel = DEFAULT_NOTENSCHLUESSEL }) {
  const { erreichteGesamtpunkte, maxGesamtpunkte } = berechneSummen(aufgaben);
  const prozentExakt = (erreichteGesamtpunkte / maxGesamtpunkte) * 100;
  const note = noteAusProzent(prozentExakt, notenschluessel);

  // "5,0" → 5.0 für den Bestanden-Check
  const noteAlsZahl = parseFloat(note.replace(",", "."));

  return {
    punkte:    Number(erreichteGesamtpunkte.toFixed(2)),
    maxPunkte: Number(maxGesamtpunkte.toFixed(2)),
    prozent:   Math.round(prozentExakt),   // ErgebnisAnzeige.jsx zeigt gerundeten Wert
    note,                                  // String wie "2,7" – direkt verwendbar im JSX
    bestanden: noteAlsZahl <= 4.0,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  DEFAULT_NOTENSCHLUESSEL,
  normalizeNotenschluessel,
  noteAusProzent,
  berechneSummen,
  pruefungAuswerten,
};