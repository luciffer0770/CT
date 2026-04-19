import { useEffect } from "react";
import { useStore } from "../store/useStore.js";

// Mounts a document-level keyboard handler for global shortcuts.
export default function KeyboardShortcuts() {
  const togglePalette = useStore(s => s.togglePalette);
  const toggleShortcuts = useStore(s => s.toggleShortcuts);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const setPage = useStore(s => s.setPage);
  const addStep = useStore(s => s.addStep);
  const page = useStore(s => s.page);
  const toggleSidebarCollapsed = useStore(s => s.toggleSidebarCollapsed);

  useEffect(() => {
    let gBuffer = 0;

    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl combos work even while editing.
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); togglePalette(true); return; }
      if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); saveNewVersion(); return; }
      if (meta && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if (meta && e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); redo(); return; }

      if (editing) return;

      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        toggleSidebarCollapsed();
        return;
      }
      if (e.key === "?") { e.preventDefault(); toggleShortcuts(true); return; }
      if (e.key.toLowerCase() === "n" && page === "builder") { e.preventDefault(); addStep(); return; }

      // "g" prefix navigation
      if (e.key.toLowerCase() === "g") {
        gBuffer = Date.now();
        return;
      }
      if (gBuffer && Date.now() - gBuffer < 900) {
        const map = {
          d: "dashboard", b: "builder", g: "gantt", a: "analytics",
          s: "sim", r: "reports", t: "tools", ",": "settings",
        };
        const target = map[e.key.toLowerCase()];
        if (target) { e.preventDefault(); setPage(target); gBuffer = 0; return; }
        gBuffer = 0;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette, toggleShortcuts, undo, redo, saveNewVersion, setPage, addStep, page, toggleSidebarCollapsed]);

  return null;
}
