import ErgebnisseTabelle from "../components/ErgebnisseTabelle";

export default function ExportPage() {
  return (
    <div style={{ padding: "32px 36px", maxWidth: "1100px" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "24px" }}>Export</h1>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <ErgebnisseTabelle />
      </div>
    </div>
  );
}
