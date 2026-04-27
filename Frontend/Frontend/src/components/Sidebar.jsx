const NAV_ITEMS = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "pruefungen", label: "Prüfungen" },
  { id: "notenschluessel", label: "Notenschlüssel" },
  { id: "export", label: "Export" },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: "175px",
      flexShrink: 0,
      backgroundColor: "#2d5a4b",
      color: "white",
      display: "flex",
      flexDirection: "column",
      padding: "28px 0",
      minHeight: "100vh",
    }}>
      <div style={{ padding: "0 20px", marginBottom: "36px" }}>
        <span style={{ color: "white", fontSize: "1rem", fontWeight: "700", letterSpacing: "-0.3px" }}>
          PunkteScanner
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "9px 20px",
                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                border: "none",
                color: isActive ? "white" : "rgba(255,255,255,0.65)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.875rem",
                fontWeight: isActive ? "500" : "400",
                transition: "background 0.15s",
              }}
            >
              <span style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isActive ? "white" : "rgba(255,255,255,0.35)",
                flexShrink: 0,
              }} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
