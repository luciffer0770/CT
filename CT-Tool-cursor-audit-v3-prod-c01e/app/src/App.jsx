import { useMemo } from "react";
import { useStore } from "./store/useStore.js";
import { computeSchedule } from "./engine/calc.js";
import { Sidebar, TopBar, StatusBar, Toasts } from "./components/Shell.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import ShortcutsModal from "./components/ShortcutsModal.jsx";
import KeyboardShortcuts from "./components/KeyboardShortcuts.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import OnlineIndicator from "./components/OnlineIndicator.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import BeforeUnloadHint from "./components/BeforeUnloadHint.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Builder from "./pages/Builder.jsx";
import GanttView from "./pages/GanttView.jsx";
import Analytics from "./pages/Analytics.jsx";
import Simulation from "./pages/Simulation.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import Tools from "./pages/Tools.jsx";

export default function App() {
  const page = useStore(s => s.page);
  const steps = useStore(s => s.steps);
  const taktTime = useStore(s => s.taktTime);
  const serializeStations = useStore(s => s.settings.serializeStations);

  const schedule = useMemo(() => {
    const stationMeta = {};
    if (serializeStations) {
      const seen = new Set();
      steps.forEach((st) => {
        const sid = st.stationId;
        if (sid && !seen.has(sid)) {
          seen.add(sid);
          stationMeta[sid] = { machines: 1 };
        }
      });
    }
    return computeSchedule(steps, taktTime, {
      serializeStations,
      stationMeta,
    });
  }, [steps, taktTime, serializeStations]);

  return (
    <>
      <ConfirmDialog/>
      <BeforeUnloadHint/>
      <ErrorBoundary>
        <div className="app" data-screen-label={page}>
          <Sidebar/>
          <TopBar schedule={schedule}/>
          <main className="main">
            <ErrorBoundary>
              {page === "dashboard" && <Dashboard schedule={schedule}/>}
              {page === "builder" && <Builder schedule={schedule}/>}
              {page === "gantt" && <GanttView schedule={schedule}/>}
              {page === "analytics" && <Analytics schedule={schedule}/>}
              {page === "sim" && <Simulation schedule={schedule}/>}
              {page === "tools" && <Tools schedule={schedule}/>}
              {page === "reports" && <Reports schedule={schedule}/>}
              {page === "settings" && <Settings/>}
            </ErrorBoundary>
            <div style={{ height: 40 }}/>
          </main>
          <div style={{ gridColumn: "1 / -1" }}>
            <StatusBar schedule={schedule}/>
          </div>
          <Toasts/>
          <CommandPalette/>
          <ShortcutsModal/>
          <KeyboardShortcuts/>
          <OnlineIndicator/>
        </div>
      </ErrorBoundary>
    </>
  );
}
