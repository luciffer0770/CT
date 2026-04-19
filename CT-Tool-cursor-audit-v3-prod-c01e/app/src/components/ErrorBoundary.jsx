import { Component } from "react";
import { useStore } from "../store/useStore.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[CTA] Uncaught error", error, info);
    this.setState({ info });
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#0B1020", minHeight: "100vh", background: "#F4F6FA" }}>
        <div style={{
          maxWidth: 720, margin: "10vh auto",
          background: "white", border: "1px solid #E2E6EF", borderRadius: 8,
          padding: 32, boxShadow: "0 12px 32px rgba(10,16,35,.1)",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 10px", borderRadius: 3,
            background: "#FDECEE", color: "#E11D2E",
            fontFamily: "monospace", fontSize: 11, fontWeight: 700,
            letterSpacing: ".1em",
          }}>SYSTEM FAULT</div>
          <h1 style={{ fontSize: 22, margin: "14px 0 6px" }}>Something broke — the app caught it before it could corrupt your data.</h1>
          <p style={{ color: "#5B6274", fontSize: 14, lineHeight: 1.5 }}>
            Your project is auto-saved in this browser's local storage, so nothing has been lost.
            You can reload the app or reset the UI state and try again.
          </p>
          <pre style={{
            marginTop: 16, padding: 12, background: "#FAFBFD",
            border: "1px solid #E2E6EF", borderRadius: 4,
            fontSize: 11, color: "#5B6274", overflow: "auto", maxHeight: 220,
          }}>
{String(this.state.error?.stack || this.state.error)}
          </pre>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={this.reset}
              style={{
                padding: "8px 14px", border: "1px solid #E2E6EF",
                borderRadius: 4, background: "white", cursor: "pointer",
              }}
            >Continue</button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 14px", border: 0,
                borderRadius: 4, background: "#1E40AF", color: "white", cursor: "pointer",
              }}
            >Reload</button>
            <button
              onClick={() => {
                useStore.getState().askConfirm({
                  title: "Reset storage?",
                  body: "This clears all Cycle Time Analyzer data in this browser (local storage), then reloads the page. Export JSON first if you need a backup.",
                  danger: true,
                  confirmLabel: "Clear and reload",
                  cancelLabel: "Cancel",
                  onConfirm: () => {
                    try {
                      localStorage.clear();
                    } catch {
                      /* ignore */
                    }
                    window.location.reload();
                  },
                });
              }}
              style={{
                padding: "8px 14px", border: "1px solid rgba(225,29,46,.25)",
                borderRadius: 4, background: "#FDECEE", color: "#E11D2E", cursor: "pointer",
              }}
            >Reset storage &amp; reload</button>
          </div>
        </div>
      </div>
    );
  }
}
