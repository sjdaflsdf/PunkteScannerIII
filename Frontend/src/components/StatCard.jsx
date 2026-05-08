export default function StatCard({ title, value, sub, color }) {
  return (
    <div style={{
      backgroundColor: color,
      color: "white",
      borderRadius: "12px",
      padding: "22px 24px",
    }}>
      <p style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "10px" }}>{title}</p>
      <p style={{ fontSize: "2rem", fontWeight: "700", lineHeight: 1, marginBottom: "6px" }}>{value}</p>
      <p style={{ fontSize: "0.78rem", opacity: 0.7 }}>{sub}</p>
    </div>
  );
}
