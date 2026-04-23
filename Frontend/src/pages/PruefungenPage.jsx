import { useBreakpoint } from "../hooks/useBreakpoint";

export default function PruefungenPage({ onNeuePruefung }) {
  const { isMobile } = useBreakpoint();
  const padding = isMobile ? "20px 16px" : "32px 36px";

  return (
    <div style={{ padding }}>
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "12px" : 0,
        marginBottom: "24px",
      }}>
        <h1 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: "600" }}>Prüfungen</h1>
        <button
          onClick={onNeuePruefung}
          style={{
            backgroundColor: "#2d5a4b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
            alignSelf: isMobile ? "flex-start" : "auto",
          }}
        >
          + Neue Prüfung
        </button>
      </div>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", color: "#999", fontSize: "0.875rem" }}>
        Alle Prüfungen werden hier aufgelistet.
      </div>
    </div>
  );
}
