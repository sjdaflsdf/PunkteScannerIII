import NotenschluesselEditor from "../components/NotenschluesselEditor";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function NotenschluesselPage() {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ padding: isMobile ? "16px" : "32px 36px", maxWidth: "500px" }}>
      <h1 style={{ fontSize: isMobile ? "1.1rem" : "1.4rem", fontWeight: "600", marginBottom: "24px" }}>Notenschlüssel</h1>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <NotenschluesselEditor pruefungName="Standard" />
      </div>
    </div>
  );
}
