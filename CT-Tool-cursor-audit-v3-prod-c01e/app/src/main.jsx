import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    const url = `${base}sw.js`.replace(/\/{2,}/g, "/").replace(":/", "://");
    navigator.serviceWorker.register(url).catch(() => {
      /* registration optional */
    });
  });
}
