const NAV_ITEMS = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "pruefungen", label: "Prüfungen" },
  { id: "notenschluessel", label: "Notenschlüssel" },
  { id: "export", label: "Export" },
];

export default function Sidebar({ activePage, onNavigate, isMobile, isOpen, onClose }) {
  if (isMobile && !isOpen) return null;

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
      ...(isMobile ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "220px",
        zIndex: 150,
        boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
        minHeight: "100%",
      } : {}),
    }}>
      <div style={{
        padding: "0 20px",
        marginBottom: "36px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ color: "white", fontSize: "1rem", fontWeight: "700", letterSpacing: "-0.3px" }}>
          PunkteScanner
        </span>
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Menü schließen"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              padding: "0 2px",
            }}
          >
            ×
          </button>
        )}
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
                padding: "10px 20px",
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
