import { useState } from "react";
import { login, setzeSession } from "../auth";

export default function LoginPage({ onLogin }) {
  const [benutzername, setBenutzername] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setFehler(null);
    const user = login(benutzername.trim(), passwort);
    if (!user) {
      setFehler("Benutzername oder Passwort falsch.");
      return;
    }
    setzeSession(user);
    onLogin(user);
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo / Titel */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={logoStyle}>P</div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#1a1a1a", marginBottom: "6px" }}>
            PunkteScanner
          </h1>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>Bitte melden Sie sich an</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Benutzername</label>
            <input
              type="text"
              value={benutzername}
              onChange={(e) => { setBenutzername(e.target.value); setFehler(null); }}
              placeholder="Benutzername eingeben"
              autoFocus
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Passwort</label>
            <input
              type="password"
              value={passwort}
              onChange={(e) => { setPasswort(e.target.value); setFehler(null); }}
              placeholder="Passwort eingeben"
              style={inputStyle}
            />
          </div>

          {fehler && (
            <div style={fehlerStyle}>{fehler}</div>
          )}

          <button type="submit" style={btnStyle}>
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#f0f2f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "40px 40px 36px",
  width: "380px",
  maxWidth: "95vw",
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
};

const logoStyle = {
  width: "52px",
  height: "52px",
  borderRadius: "14px",
  backgroundColor: "#2d5a4b",
  color: "white",
  fontSize: "1.5rem",
  fontWeight: "700",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 14px",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "600",
  color: "#555",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "0.9rem",
  color: "#333",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "white",
  transition: "border-color 0.15s",
};

const fehlerStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "#c00",
  fontSize: "0.82rem",
  marginBottom: "16px",
};

const btnStyle = {
  width: "100%",
  backgroundColor: "#2d5a4b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px",
  fontSize: "0.9rem",
  fontWeight: "600",
  cursor: "pointer",
  letterSpacing: "0.02em",
};
