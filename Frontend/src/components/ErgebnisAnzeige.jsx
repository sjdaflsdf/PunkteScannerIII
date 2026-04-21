function berechneNote(prozent) {
  if (prozent >= 87) return "1";
  if (prozent >= 75) return "2";
  if (prozent >= 63) return "3";
  if (prozent >= 50) return "4";
  if (prozent >= 25) return "5";
  return "6";
}

function ErgebnisAnzeige({ aufgaben }) {
  const erreicht = aufgaben.reduce((sum, a) => sum + a.punkte, 0);
  const maximal = aufgaben.reduce((sum, a) => sum + a.maxPunkte, 0);
  const prozent = maximal > 0 ? Math.round((erreicht / maximal) * 100) : 0;
  const note = berechneNote(prozent);

  return (
    <div>
      <h2>Auswertung</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <th style={thStyle}>Aufgabe</th>
            <th style={thStyle}>Erreicht</th>
            <th style={thStyle}>Maximum</th>
          </tr>
        </thead>
        <tbody>
          {aufgaben.map((aufgabe) => (
            <tr key={aufgabe.id}>
              <td style={tdStyle}>{aufgabe.name}</td>
              <td style={tdStyle}>{aufgabe.punkte}</td>
              <td style={tdStyle}>{aufgabe.maxPunkte}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ backgroundColor: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
        <p><strong>Gesamtpunkte:</strong> {erreicht} / {maximal}</p>
        <p><strong>Prozent:</strong> {prozent}%</p>
        <p style={{ fontSize: "1.4rem" }}>
          <strong>Note: {note}</strong>
        </p>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #ccc",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};

export default ErgebnisAnzeige;
