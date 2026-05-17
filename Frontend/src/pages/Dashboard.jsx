import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "20px" }}>
            <h1>PunkteScanner – Dashboard</h1>
            <p>Willkommen zurück</p>

            {/* Beispiel – später kommen echte Prüfungen vom Backend */}
            <button
                onClick={() => navigate("/pruefung/1")}
                style={{
                    padding: "10px 20px",
                    background: "#0F6E56",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                }}
            >
                Prüfung öffnen
            </button>
        </div>
    );
}