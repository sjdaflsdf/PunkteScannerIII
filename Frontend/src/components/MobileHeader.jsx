import { useState } from "react";

export default function MobileHeader({ user, onLogout, title }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        flexShrink: 0,
        height: "56px",
        backgroundColor: "#2d5a4b",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        zIndex: 10,
      }}>
        <span style={{ color: "white", fontWeight: "700", fontSize: "1rem", letterSpacing: "-0.2px" }}>
          PunkteScanner
        </span>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: "34px", height: "34px", borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "none", cursor: "pointer",
            color: "white", fontWeight: "700", fontSize: "0.9rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {(user?.benutzername?.[0] ?? "?").toUpperCase()}
        </button>
      </header>

      {/* User-Dropdown */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        />
      )}
      {menuOpen && (
        <div style={{
          position: "fixed", top: "62px", right: "12px", zIndex: 200,
          backgroundColor: "white", borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "8px", minWidth: "180px",
        }}>
          <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#1a1a1a" }}>{user?.benutzername}</p>
            <p style={{ fontSize: "0.75rem", color: "#999" }}>
              {user?.rolle === "admin" ? "Administrator" : "Benutzer"}
            </p>
          </div>
          <button
            onClick={() => { setMenuOpen(false); onLogout(); }}
            style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              background: "none", border: "none", cursor: "pointer",
              color: "#e57373", fontSize: "0.875rem", fontWeight: "500",
              borderRadius: "6px",
            }}
          >
            Abmelden
          </button>
        </div>
      )}
    </>
  );
}
