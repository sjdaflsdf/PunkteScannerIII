import { useState } from "react";

function UploadForm({ onAuswerten }) {
  const [datei, setDatei] = useState(null);

  function handleDateiWahl(e) {
    setDatei(e.target.files[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!datei) {
      alert("Bitte zuerst eine Datei auswählen.");
      return;
    }
    onAuswerten(datei);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
        Prüfung hochladen (PDF oder Bild):
      </label>

      <input
        type="file"
        accept=".pdf,image/*"
        onChange={handleDateiWahl}
        style={{ display: "block", marginBottom: "16px" }}
      />

      {datei && (
        <p style={{ color: "#555", marginBottom: "16px" }}>
          Ausgewählt: <strong>{datei.name}</strong>
        </p>
      )}

      <button type="submit" style={{ padding: "8px 20px", cursor: "pointer" }}>
        Auswerten
      </button>
    </form>
  );
}

export default UploadForm;
