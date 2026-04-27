const FARBEN = {
  "1,x": "#4CAF50",
  "2,x": "#8BC34A",
  "3,x": "#FF9800",
  "4,x": "#F44336",
  "5,0": "#B71C1C",
};

export default function NotenverteilungChart({ daten, pruefungName = "" }) {
  if (!daten || daten.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
          Notenverteilung{pruefungName ? ` – ${pruefungName}` : ""}
        </h3>
        <p style={{ color: "#bbb", fontSize: "0.82rem", marginTop: "16px" }}>
          Keine Verteilungsdaten verfügbar.
        </p>
      </div>
    );
  }

  const maxCount      = Math.max(...daten.map((n) => n.count));
  const gesamt        = daten.reduce((s, n) => s + n.count, 0);
  const bestanden     = daten.filter((n) => n.label !== "5,0").reduce((s, n) => s + n.count, 0);
  const bestehensQuote = gesamt > 0 ? Math.round((bestanden / gesamt) * 100) : 0;
  const schnittRoh    = gesamt > 0
    ? daten.reduce((s, n) => s + parseFloat(n.label.replace(",", ".").replace("x", "5")) * n.count, 0) / gesamt
    : null;
  const schnitt = schnittRoh !== null ? schnittRoh.toFixed(1).replace(".", ",") : "–";

  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
        Notenverteilung{pruefungName ? ` – ${pruefungName}` : ""}
      </h3>
      <p style={{ color: "#888", fontSize: "0.78rem", marginBottom: "20px" }}>
        {gesamt} Studierende · Ø Note {schnitt} · {bestehensQuote}% bestanden
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {daten.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "26px", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: "4px", height: "13px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                  backgroundColor: item.color ?? FARBEN[item.label] ?? "#aaa",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span style={{ width: "18px", textAlign: "right", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
