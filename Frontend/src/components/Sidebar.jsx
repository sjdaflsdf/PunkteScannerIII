const NAV_ITEMS = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "pruefungen", label: "Prüfungen" },
  { id: "notenschluessel", label: "Notenschlüssel" },
  { id: "export", label: "Export" },
];

export default function Sidebar({ activePage, onNavigate, user, onLogout }) {
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

        {/* Benutzerverwaltung nur für Admin */}
        {user?.rolle === "admin" && (() => {
          const isActive = activePage === "benutzer";
          return (
            <button
              onClick={() => onNavigate("benutzer")}
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
              Benutzer
            </button>
          );
        })()}
      </nav>

      {/* Benutzerinfo + Abmelden */}
      <div style={{ marginTop: "auto", padding: "0 16px 4px" }}>
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", fontWeight: "700", flexShrink: 0,
            }}>
              {(user?.benutzername?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.benutzername}
              </p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
                {user?.rolle === "admin" ? "Administrator" : "Benutzer"}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "7px",
              color: "rgba(255,255,255,0.85)",
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: "0.8rem",
              textAlign: "center",
              transition: "background 0.15s",
            }}
          >
            Abmelden
          </button>
        </div>
      </div>
    </aside>
  );
}
