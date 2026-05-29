export default function StatCard({ title, value, sub, color, compact }) {
  return (
    <div style={{
      backgroundColor: color,
      color: "white",
      borderRadius: compact ? "10px" : "12px",
      padding: compact ? "11px 13px" : "22px 24px",
    }}>
      <p style={{ fontSize: compact ? "0.68rem" : "0.8rem", opacity: 0.75, marginBottom: compact ? "5px" : "10px", fontWeight: "500" }}>{title}</p>
      <p style={{ fontSize: compact ? "1.55rem" : "2rem", fontWeight: "700", lineHeight: 1, marginBottom: compact ? "3px" : "6px" }}>{value}</p>
      <p style={{ fontSize: compact ? "0.68rem" : "0.78rem", opacity: 0.7 }}>{sub}</p>
    </div>
  );
}
