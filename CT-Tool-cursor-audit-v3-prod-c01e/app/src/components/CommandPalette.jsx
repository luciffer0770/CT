import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/useStore.js";
import Icon from "./Icon.jsx";

export default function CommandPalette() {
  const open = useStore(s => s.palette);
  const toggle = useStore(s => s.togglePalette);
  const setPage = useStore(s => s.setPage);
  const steps = useStore(s => s.steps);
  const setSelectedId = useStore(s => s.setSelectedId);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const exportJSON = useStore(s => s.exportProjectJSON);
  const addStep = useStore(s => s.addStep);
  const setSettings = useStore(s => s.setSettings);
  const settings = useStore(s => s.settings);
  const resetToBaseline = useStore(s => s.resetToBaseline);

  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const commands = useMemo(() => {
    const nav = (id, label, shortcut) => ({ id: `nav-${id}`, kind: "Go to", label, kbd: shortcut, run: () => setPage(id) });
    const base = [
      nav("dashboard", "Dashboard", "G D"),
      nav("builder", "Cycle Builder", "G B"),
      nav("gantt", "Gantt View", "G G"),
      nav("analytics", "Analytics", "G A"),
      nav("sim", "Simulation", "G S"),
      nav("reports", "Reports", "G R"),
      nav("tools", "Industrial Tools", "G T"),
      nav("settings", "Settings", "G ,"),
      { id: "act-add", kind: "Action", label: "Add new step", kbd: "N", run: () => { setPage("builder"); addStep(); } },
      { id: "act-save", kind: "Action", label: "Save version", kbd: "⌘S", run: () => saveNewVersion() },
      { id: "act-undo", kind: "Action", label: "Undo", kbd: "⌘Z", run: () => undo() },
      { id: "act-redo", kind: "Action", label: "Redo", kbd: "⌘⇧Z", run: () => redo() },
      { id: "act-baseline", kind: "Action", label: "Reset to baseline", run: () => resetToBaseline() },
      { id: "act-json", kind: "Action", label: "Export project JSON", run: () => exportJSON() },
      { id: "act-theme", kind: "Action", label: `Toggle theme (current: ${settings.theme})`, run: () => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" }) },
      { id: "act-compact", kind: "Action", label: `Toggle compact density (${settings.compact ? "on" : "off"})`, run: () => setSettings({ compact: !settings.compact }) },
    ];
    const stepCmds = steps.map(s => ({
      id: `step-${s.id}`,
      kind: "Open step",
      label: s.name,
      run: () => { setSelectedId(s.id); setPage("builder"); },
    }));
    return base.concat(stepCmds);
  }, [steps, settings, setPage, setSelectedId, saveNewVersion, undo, redo, exportJSON, addStep, resetToBaseline, setSettings]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const ql = q.toLowerCase();
    return commands.filter(c => c.label.toLowerCase().includes(ql) || c.kind.toLowerCase().includes(ql));
  }, [q, commands]);

  useEffect(() => { if (cursor >= filtered.length) setCursor(0); }, [filtered.length]);

  if (!open) return null;

  const run = (c) => { toggle(false); setTimeout(() => c.run(), 30); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(filtered.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[cursor]) run(filtered[cursor]); }
    else if (e.key === "Escape") { e.preventDefault(); toggle(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) toggle(false); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command or search a step…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setCursor(0); }}
        />
        <div className="palette-list">
          {filtered.length === 0 && <div style={{ padding: 20, color: "var(--ink-4)", textAlign: "center" }}>No matches</div>}
          {filtered.slice(0, 40).map((c, i) => (
            <div key={c.id} className={`palette-item ${i === cursor ? "active" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => run(c)}
            >
              <Icon name={c.kind === "Action" ? "zap" : c.kind === "Open step" ? "build" : "chev-right"} size={14}/>
              <div>
                <div style={{ fontWeight: 500 }}>{c.label}</div>
                <div className="muted mono" style={{ fontSize: 10, marginTop: 2 }}>{c.kind.toUpperCase()}</div>
              </div>
              {c.kbd && <span className="kbd">{c.kbd}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
