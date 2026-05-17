const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconPruefungen = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const IconExport = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconNotenschluessel = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconBenutzer = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function MobileNavBar({ activePage, onNavigate, user }) {
  const items = [
    { id: "uebersicht",     label: "Übersicht",     Icon: IconHome },
    { id: "pruefungen",     label: "Prüfungen",     Icon: IconPruefungen },
    { id: "notenschluessel",label: "Noten",         Icon: IconNotenschluessel },
    { id: "export",         label: "Export",        Icon: IconExport },
    ...(user?.rolle === "admin"
      ? [{ id: "benutzer", label: "Benutzer", Icon: IconBenutzer }]
      : []),
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      height: "64px",
      backgroundColor: "white",
      borderTop: "1px solid #e8e8e8",
      display: "flex", alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom)",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.07)",
    }}>
      {items.map(({ id, label, Icon }) => {
        const active = activePage === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "3px",
              background: "none", border: "none", cursor: "pointer",
              color: active ? "#2d5a4b" : "#aaa",
              padding: "6px 4px",
              transition: "color 0.15s",
            }}
          >
            <Icon />
            <span style={{ fontSize: "0.65rem", fontWeight: active ? "600" : "400", letterSpacing: "0.01em" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
