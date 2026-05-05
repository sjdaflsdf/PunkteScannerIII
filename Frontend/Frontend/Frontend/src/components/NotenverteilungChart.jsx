const NOTEN_DATEN = [
  { label: "1,x", count: 8,  color: "#4CAF50" },
  { label: "2,x", count: 15, color: "#8BC34A" },
  { label: "3,x", count: 7,  color: "#FF9800" },
  { label: "4,x", count: 3,  color: "#F44336" },
  { label: "5,0", count: 1,  color: "#B71C1C" },
];

const MAX_COUNT = Math.max(...NOTEN_DATEN.map((n) => n.count));

export default function NotenverteilungChart({ pruefungName = "Softwareentwicklung I" }) {
  const gesamt = NOTEN_DATEN.reduce((s, n) => s + n.count, 0);
  const bestanden = NOTEN_DATEN.filter((n) => n.label !== "5,0").reduce((s, n) => s + n.count, 0);
  const schnitt = (
    NOTEN_DATEN.reduce((s, n) => s + parseFloat(n.label.replace(",", ".").replace("x", "5")) * n.count, 0) /
    gesamt
  ).toFixed(1).replace(".", ",");
  const bestehensQuote = Math.round((bestanden / gesamt) * 100);

  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "4px" }}>
        Notenverteilung – {pruefungName}
      </h3>
      <p style={{ color: "#888", fontSize: "0.78rem", marginBottom: "20px" }}>
        {gesamt} Studierende · Ø Note {schnitt} · {bestehensQuote}% bestanden
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {NOTEN_DATEN.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "26px", fontSize: "0.8rem", color: "#666", flexShrink: 0 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: "4px", height: "13px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(item.count / MAX_COUNT) * 100}%`,
                  backgroundColor: item.color,
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
