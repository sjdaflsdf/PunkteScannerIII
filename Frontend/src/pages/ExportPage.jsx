import ErgebnisseTabelle from "../components/ErgebnisseTabelle";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function ExportPage() {
  const { isMobile } = useBreakpoint();
  const padding = isMobile ? "20px 16px" : "32px 36px";

  return (
    <div style={{ padding, maxWidth: "1100px" }}>
      <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600", marginBottom: "24px" }}>
        Export
      </h1>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: isMobile ? "16px" : "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <ErgebnisseTabelle />
      </div>
    </div>
  );
}
