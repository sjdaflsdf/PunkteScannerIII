import { useState } from "react";
import Sidebar from "./components/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import PruefungenPage from "./pages/PruefungenPage";
import NotenschluesselPage from "./pages/NotenschluesselPage";
import ExportPage from "./pages/ExportPage";
import ErgebnisPage from "./pages/ErgebnisPage";
import UploadModal from "./components/UploadModal";

export default function App() {
  const [activePage, setActivePage] = useState("uebersicht");
  const [showUpload, setShowUpload] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);

  function handleErgebnis(result) {
    setErgebnis(result);
    setShowUpload(false);
  }

  function handleNavigate(page) {
    setErgebnis(null);
    setActivePage(page);
  }

  function renderPage() {
    if (ergebnis) {
      return (
        <ErgebnisPage
          ergebnis={ergebnis}
          onZurueck={() => setErgebnis(null)}
        />
      );
    }
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar activePage={ergebnis ? null : activePage} onNavigate={handleNavigate} />
      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#f0f2f0" }}>
        {renderPage()}
      </main>
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onErgebnis={handleErgebnis}
        />
      )}
    </div>
  );
}
