import { useState } from "react";
import Sidebar from "./components/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import PruefungenPage from "./pages/PruefungenPage";
import NotenschluesselPage from "./pages/NotenschluesselPage";
import ExportPage from "./pages/ExportPage";
import UploadModal from "./components/UploadModal";

export default function App() {
  const [activePage, setActivePage] = useState("uebersicht");
  const [showUpload, setShowUpload] = useState(false);

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#f0f2f0" }}>
        {renderPage()}
      </main>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
