import NotenschluesselEditor from "../components/NotenschluesselEditor";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function NotenschluesselPage() {
  const { isMobile } = useBreakpoint();
  const padding = isMobile ? "20px 16px" : "32px 36px";

  return (
    <div style={{ padding, maxWidth: isMobile ? "100%" : "500px" }}>
      <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600", marginBottom: "24px" }}>
        Notenschlüssel
      </h1>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <NotenschluesselEditor pruefungName="Standard" />
      </div>
    </div>
  );
}
