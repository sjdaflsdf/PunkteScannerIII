import UploadForm from "../components/UploadForm";

function UploadPage({ onWeiter }) {
  function handleAuswerten(datei) {
    // Hier später: Datei ans Backend senden
    console.log("Datei zur Auswertung:", datei.name);
    onWeiter();
  }

  return (
    <div>
      <h2>Prüfung hochladen</h2>
      <p style={{ color: "#555", marginBottom: "20px" }}>
        Lade eine Prüfung als PDF oder Bild hoch, um die Punkte automatisch auswerten zu lassen.
      </p>
      <UploadForm onAuswerten={handleAuswerten} />
    </div>
  );
}

export default UploadPage;
