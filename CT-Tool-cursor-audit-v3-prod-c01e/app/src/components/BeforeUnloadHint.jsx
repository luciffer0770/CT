import { useEffect } from "react";
import { useStore } from "../store/useStore.js";

/**
 * Warns when closing the tab if workspace changed since last JSON export (backup reminder).
 */
export default function BeforeUnloadHint() {
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!useStore.getState().needsExportReminder()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return null;
}
