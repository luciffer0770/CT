import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore.js";

export default function ConfirmDialog() {
  const confirmDialog = useStore(s => s.confirmDialog);
  const closeConfirm = useStore(s => s.closeConfirm);
  const panelRef = useRef(null);
  const open = confirmDialog.open;

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (el && typeof el.focus === "function") el.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeConfirm();
      }
      if (e.key === "Tab" && panelRef.current) {
        const root = panelRef.current;
        const focusables = root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(focusables).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeConfirm]);

  if (!open) return null;

  const onConfirm = () => {
    const fn = confirmDialog.onConfirm;
    closeConfirm();
    if (typeof fn === "function") fn();
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 12000,
        background: "rgba(11,16,32,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeConfirm();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cta-confirm-title"
        className="card"
        style={{
          maxWidth: 440, width: "100%",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          padding: 0, overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="card-head" style={{ padding: "14px 18px" }}>
          <h3 id="cta-confirm-title" style={{ margin: 0, fontSize: 15 }}>{confirmDialog.title}</h3>
        </div>
        <div className="card-body" style={{ padding: "0 18px 18px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
          {confirmDialog.body}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0 18px 18px" }}>
          <button type="button" className="btn" onClick={closeConfirm}>{confirmDialog.cancelLabel || "Cancel"}</button>
          <button
            type="button"
            className={confirmDialog.danger ? "btn danger" : "btn accent"}
            onClick={onConfirm}
          >
            {confirmDialog.confirmLabel || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
