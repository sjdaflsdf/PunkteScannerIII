import { useState } from "react";
import { useBreakpoint } from "./hooks/useBreakpoint";
import Sidebar from "./components/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import PruefungenPage from "./pages/PruefungenPage";
import NotenschluesselPage from "./pages/NotenschluesselPage";
import ExportPage from "./pages/ExportPage";
import UploadModal from "./components/UploadModal";

export default function App() {
  const [activePage, setActivePage] = useState("uebersicht");
  const [showUpload, setShowUpload] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  function renderPage() {
    switch (activePage) {
      case "uebersicht":
        return <OverviewPage onNeuePruefung={() => setShowUpload(true)} />;
      case "pruefungen":
        return <PruefungenPage onNeuePruefung={() => setShowUpload(true)} />;
      case "notenschluessel":
        return <NotenschluesselPage />;
      case "export":
        return <ExportPage />;
      default:
        return <OverviewPage onNeuePruefung={() => setShowUpload(true)} />;
    }
  }

  function handleNavigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>

      {isMobile && (
        <header style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: "56px",
          backgroundColor: "#2d5a4b",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Menü öffnen"
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: "1.3rem",
              lineHeight: 1,
            }}
          >
            ☰
          </button>
          <span style={{ color: "white", fontWeight: "700", fontSize: "1rem", letterSpacing: "-0.3px" }}>
            PunkteScanner
          </span>
        </header>
      )}

      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 149,
          }}
        />
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "#f0f2f0",
        marginTop: isMobile ? "56px" : 0,
      }}>
        {renderPage()}
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
