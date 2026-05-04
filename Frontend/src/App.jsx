import { useState } from "react";
import Sidebar from "./components/Sidebar";
import NeuePruefungModal from "./components/NeuePruefungModal";
import UploadModal from "./components/UploadModal";
import OverviewPage from "./pages/OverviewPage";
import PruefungenPage from "./pages/PruefungenPage";
import PruefungDetail from "./pages/PruefungDetail";
import NotenschluesselPage from "./pages/NotenschluesselPage";
import ExportPage from "./pages/ExportPage";
import ErgebnisPage from "./pages/ErgebnisPage";

export default function App() {
  const [activePage, setActivePage] = useState("uebersicht");
  const [showNeuePruefung, setShowNeuePruefung] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [selectedPruefung, setSelectedPruefung] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleErgebnis(result) {
    setErgebnis(result);
    setShowUpload(false);
  }

  function handleNavigate(page) {
    setErgebnis(null);
    setSelectedPruefung(null);
    setActivePage(page);
  }

  function handlePruefungAngelegt() {
    setShowNeuePruefung(false);
    setRefreshKey((k) => k + 1);
  }

  function renderPage() {
    if (selectedPruefung) {
      return (
        <PruefungDetail
          pruefung={selectedPruefung}
          onZurueck={() => setSelectedPruefung(null)}
        />
      );
    }
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
        return (
          <OverviewPage
            key={refreshKey}
            onNeuePruefung={() => setShowNeuePruefung(true)}
            onPruefungOeffnen={setSelectedPruefung}
          />
        );
      case "pruefungen":
        return (
          <PruefungenPage
            key={refreshKey}
            onNeuePruefung={() => setShowNeuePruefung(true)}
            onPruefungOeffnen={setSelectedPruefung}
          />
        );
      case "notenschluessel":
        return <NotenschluesselPage />;
      case "export":
        return <ExportPage />;
      default:
        return (
          <OverviewPage
            key={refreshKey}
            onNeuePruefung={() => setShowNeuePruefung(true)}
            onPruefungOeffnen={setSelectedPruefung}
          />
        );
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar
        activePage={ergebnis || selectedPruefung ? null : activePage}
        onNavigate={handleNavigate}
      />
      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#f0f2f0" }}>
        {renderPage()}
      </main>
      {showNeuePruefung && (
        <NeuePruefungModal
          onClose={() => setShowNeuePruefung(false)}
          onErfolgreich={handlePruefungAngelegt}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onErgebnis={handleErgebnis}
        />
      )}
    </div>
  );
}
