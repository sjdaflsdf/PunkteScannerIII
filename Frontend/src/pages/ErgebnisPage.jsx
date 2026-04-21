import ErgebnisAnzeige from "../components/ErgebnisAnzeige";

// Fake-Daten – später durch echte Backend-Antwort ersetzen
const FAKE_AUFGABEN = [
  { id: 1, name: "Aufgabe 1", punkte: 8, maxPunkte: 10 },
  { id: 2, name: "Aufgabe 2", punkte: 5, maxPunkte: 10 },
  { id: 3, name: "Aufgabe 3", punkte: 10, maxPunkte: 10 },
  { id: 4, name: "Aufgabe 4", punkte: 6, maxPunkte: 15 },
  { id: 5, name: "Aufgabe 5", punkte: 12, maxPunkte: 15 },
];

function ErgebnisPage({ onZurueck }) {
  return (
    <div>
      <ErgebnisAnzeige aufgaben={FAKE_AUFGABEN} />

      <button
        onClick={onZurueck}
        style={{ marginTop: "24px", padding: "8px 20px", cursor: "pointer" }}
      >
        Neue Prüfung hochladen
      </button>
    </div>
  );
}

export default ErgebnisPage;
