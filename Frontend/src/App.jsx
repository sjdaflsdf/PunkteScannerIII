import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";
import MobileNavBar from "./components/MobileNavBar";
import { useBreakpoint } from "./hooks/useBreakpoint";
import NeuePruefungModal from "./components/NeuePruefungModal";
import UploadModal from "./components/UploadModal";
import OverviewPage from "./pages/OverviewPage";
import PruefungenPage from "./pages/PruefungenPage";
import PruefungDetail from "./pages/PruefungDetail";
import LokalePruefungDetail from "./pages/LokalePruefungDetail";
import NotenschluesselPage from "./pages/NotenschluesselPage";
import ExportPage from "./pages/ExportPage";
import ErgebnisPage from "./pages/ErgebnisPage";
import PruefungAnlegenModal from "./components/PruefungAnlegenModal";
import LokalPruefungAnlegenModal from "./components/LokalPruefungAnlegenModal";
import LoginPage from "./pages/LoginPage";
import BenutzerVerwaltungPage from "./pages/BenutzerVerwaltungPage";
import { initialisiere, aktuellerBenutzer, logout } from "./auth";

initialisiere();

export default function App() {
  const { isMobile } = useBreakpoint();
  const [user, setUser] = useState(aktuellerBenutzer());
  const [activePage, setActivePage] = useState("uebersicht");
  const [showNeuePruefung, setShowNeuePruefung] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAnlegen, setShowAnlegen] = useState(false);
  const [showAnlegenLokal, setShowAnlegenLokal] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [selectedPruefung, setSelectedPruefung] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleErgebnis(result) {
    setErgebnis(result);
    setShowUpload(false);
  }

  function handleLogout() {
    logout();
    setUser(null);
    setActivePage("uebersicht");
    setErgebnis(null);
    setSelectedPruefung(null);
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

  function handlePruefungOeffnen(p) {
    setErgebnis(null);
    setSelectedPruefung(p);
  }

  function renderPage() {
    if (selectedPruefung?.lokal) {
      return (
        <LokalePruefungDetail
          pruefung={selectedPruefung}
          onZurueck={() => setSelectedPruefung(null)}
        />
      );
    }
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
            onNeuePruefung={() => setShowAnlegen(true)}
            onNeuePruefungLokal={() => setShowAnlegenLokal(true)}
            onAuswerten={() => setShowUpload(true)}
            onPruefungOeffnen={handlePruefungOeffnen}
          />
        );
      case "pruefungen":
        return (
          <PruefungenPage
            onNeuePruefung={() => setShowAnlegen(true)}
            onNeuePruefungLokal={() => setShowAnlegenLokal(true)}
            onAuswerten={() => setShowUpload(true)}
            onPruefungOeffnen={handlePruefungOeffnen}
          />
        );
      case "notenschluessel":
        return <NotenschluesselPage />;
      case "export":
        return <ExportPage />;
      case "benutzer":
        return user?.rolle === "admin"
          ? <BenutzerVerwaltungPage aktuellerBenutzer={user} />
          : null;
      default:
        return (
          <OverviewPage
            onNeuePruefung={() => setShowAnlegen(true)}
            onNeuePruefungLokal={() => setShowAnlegenLokal(true)}
            onAuswerten={() => setShowUpload(true)}
            onPruefungOeffnen={handlePruefungOeffnen}
          />
        );
    }
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const modals = (
    <>
      {showAnlegen && (
        <PruefungAnlegenModal
          onClose={() => setShowAnlegen(false)}
          onAngelegt={() => {}}
        />
      )}
      {showAnlegenLokal && (
        <LokalPruefungAnlegenModal
          onClose={() => setShowAnlegenLokal(false)}
          onAngelegt={(pruefung) => {
            setShowAnlegenLokal(false);
            setSelectedPruefung(pruefung);
          }}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onErgebnis={handleErgebnis}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "#f0f2f0",
      }}>
        <MobileHeader user={user} onLogout={handleLogout} />
        <main style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          {renderPage()}
        </main>
        <MobileNavBar
          activePage={ergebnis || selectedPruefung ? null : activePage}
          onNavigate={handleNavigate}
          user={user}
        />
        {modals}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar
        activePage={ergebnis || selectedPruefung ? null : activePage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
      />
      <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#f0f2f0" }}>
        {renderPage()}
      </main>
      {modals}
    </div>
  );
}
