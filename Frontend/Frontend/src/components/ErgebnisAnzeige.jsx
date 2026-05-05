function berechneNote(prozent) {
  if (prozent >= 87) return "1";
  if (prozent >= 75) return "2";
  if (prozent >= 63) return "3";
  if (prozent >= 50) return "4";
  if (prozent >= 25) return "5";
  return "6";
}

export default function ErgebnisAnzeige({ aufgaben, note }) {
  if (!aufgaben || aufgaben.length === 0) {
    return (
      <p style={{ color: "#999", fontSize: "0.875rem" }}>Keine Aufgaben vorhanden.</p>
    );
  }

  const erreicht = aufgaben.reduce((sum, a) => sum + (a.punkte ?? 0), 0);
  const maximal  = aufgaben.reduce((sum, a) => sum + (a.maxPunkte ?? 0), 0);
  const prozent  = maximal > 0 ? Math.round((erreicht / maximal) * 100) : 0;
  const anzeigenNote = note ?? berechneNote(prozent);

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>Aufgabenübersicht</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f2f0" }}>
            <th style={thStyle}>Aufgabe</th>
            <th style={thStyle}>Erreicht</th>
            <th style={thStyle}>Maximum</th>
          </tr>
        </thead>
        <tbody>
          {aufgaben.map((aufgabe, i) => (
            <tr key={aufgabe.id ?? i}>
              <td style={tdStyle}>{aufgabe.name}</td>
              <td style={tdStyle}>{aufgabe.punkte}</td>
              <td style={tdStyle}>{aufgabe.maxPunkte}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ backgroundColor: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
        <p style={{ marginBottom: "6px" }}><strong>Gesamtpunkte:</strong> {erreicht} / {maximal}</p>
        <p style={{ marginBottom: "6px" }}><strong>Prozent:</strong> {prozent}%</p>
        <p style={{ fontSize: "1.4rem", marginTop: "8px" }}>
          <strong>Note: {anzeigenNote}</strong>
        </p>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #ccc",
  fontSize: "0.82rem",
  fontWeight: "600",
  color: "#555",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  fontSize: "0.875rem",
};
