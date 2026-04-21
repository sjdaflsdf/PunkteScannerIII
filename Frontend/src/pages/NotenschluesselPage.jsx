import NotenschluesselEditor from "../components/NotenschluesselEditor";

export default function NotenschluesselPage() {
  return (
    <div style={{ padding: "32px 36px", maxWidth: "500px" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "24px" }}>Notenschlüssel</h1>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <NotenschluesselEditor pruefungName="Standard" />
      </div>
    </div>
  );
}
