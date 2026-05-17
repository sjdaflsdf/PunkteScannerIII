import { useState } from "react";
import { alleBenutzer, benutzerAnlegen, benutzerLoeschen } from "../auth";

export default function BenutzerVerwaltungPage({ aktuellerBenutzer }) {
  const [benutzer, setBenutzer] = useState(alleBenutzer());
  const [neuerName, setNeuerName] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [fehler, setFehler] = useState(null);
  const [erfolg, setErfolg] = useState(null);

  function handleAnlegen(e) {
    e.preventDefault();
    setFehler(null);
    setErfolg(null);

    if (!neuerName.trim()) { setFehler("Benutzername darf nicht leer sein."); return; }
    if (!neuesPasswort) { setFehler("Passwort darf nicht leer sein."); return; }

    const ok = benutzerAnlegen(neuerName.trim(), neuesPasswort);
    if (!ok) {
      setFehler(`Der Benutzername „${neuerName.trim()}" ist bereits vergeben.`);
      return;
    }
    setBenutzer(alleBenutzer());
    setNeuerName("");
    setNeuesPasswort("");
    setErfolg(`Benutzer „${neuerName.trim()}" wurde angelegt.`);
  }

  function handleLoeschen(benutzername) {
    if (!window.confirm(`Benutzer „${benutzername}" wirklich löschen?`)) return;
    benutzerLoeschen(benutzername);
    setBenutzer(alleBenutzer());
    setErfolg(`Benutzer „${benutzername}" wurde gelöscht.`);
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: "700px" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: "600", marginBottom: "24px" }}>Benutzerverwaltung</h1>

      {/* Neuen Benutzer anlegen */}
      <div style={card}>
        <h2 style={sectionLabel}>Neuen Benutzer anlegen</h2>
        <form onSubmit={handleAnlegen}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Benutzername</label>
              <input
                type="text"
                value={neuerName}
                onChange={(e) => { setNeuerName(e.target.value); setFehler(null); setErfolg(null); }}
                placeholder="z. B. max.mustermann"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Passwort</label>
              <input
                type="password"
                value={neuesPasswort}
                onChange={(e) => { setNeuesPasswort(e.target.value); setFehler(null); setErfolg(null); }}
                placeholder="Passwort wählen"
                style={inputStyle}
              />
            </div>
          </div>

          {fehler && <div style={fehlerStyle}>{fehler}</div>}
          {erfolg && <div style={erfolgStyle}>{erfolg}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={primaerBtn}>Benutzer anlegen</button>
          </div>
        </form>
      </div>

      {/* Benutzerliste */}
      <div style={card}>
        <h2 style={sectionLabel}>Alle Benutzer ({benutzer.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e8e8e8" }}>
              <th style={th}>Benutzername</th>
              <th style={th}>Rolle</th>
              <th style={{ ...th, width: "80px" }} />
            </tr>
          </thead>
          <tbody>
            {benutzer.map((u) => (
              <tr key={u.benutzername} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={td}>
                  <span style={{ fontWeight: "500" }}>{u.benutzername}</span>
                  {u.benutzername === aktuellerBenutzer?.benutzername && (
                    <span style={{ marginLeft: "8px", fontSize: "0.72rem", backgroundColor: "#e8f5e9", color: "#2d5a4b", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                      Ich
                    </span>
                  )}
                </td>
                <td style={td}>
                  <span style={{
                    backgroundColor: u.rolle === "admin" ? "#fff8e1" : "#f5f5f5",
                    color: u.rolle === "admin" ? "#a16800" : "#666",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "0.78rem",
                    fontWeight: "500",
                    border: u.rolle === "admin" ? "1px solid #ffe082" : "1px solid #e0e0e0",
                  }}>
                    {u.rolle === "admin" ? "Administrator" : "Benutzer"}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  {u.benutzername !== "admin" && u.benutzername !== aktuellerBenutzer?.benutzername && (
                    <button
                      onClick={() => handleLoeschen(u.benutzername)}
                      style={{ border: "1px solid #fcc", background: "white", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", color: "#e57373" }}
                    >
                      Löschen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const card = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "22px 24px",
  marginBottom: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sectionLabel = {
  fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#999", marginBottom: "16px",
};

const labelStyle = {
  display: "block", fontSize: "0.8rem", fontWeight: "600",
  color: "#555", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%", border: "1px solid #e0e0e0", borderRadius: "6px",
  padding: "8px 12px", fontSize: "0.875rem", color: "#333",
  outline: "none", boxSizing: "border-box", backgroundColor: "white",
};

const th = { padding: "8px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: "600", color: "#666" };
const td = { padding: "12px 12px", verticalAlign: "middle" };

const primaerBtn = {
  backgroundColor: "#2d5a4b", color: "white", border: "none",
  padding: "8px 20px", borderRadius: "8px", cursor: "pointer",
  fontWeight: "500", fontSize: "0.875rem",
};

const fehlerStyle = {
  backgroundColor: "#fff3f3", border: "1px solid #fcc", borderRadius: "8px",
  padding: "10px 14px", color: "#c00", fontSize: "0.82rem", marginBottom: "12px",
};

const erfolgStyle = {
  backgroundColor: "#f0f7f4", border: "1px solid #b2dfdb", borderRadius: "8px",
  padding: "10px 14px", color: "#2d5a4b", fontSize: "0.82rem", marginBottom: "12px",
};
