import { create } from "zustand";
import {
  saveProject,
  loadProject,
  saveVersion,
  loadVersions,
  deleteVersion,
  saveSettings,
  loadSettings,
  onStorageError,
  saveLastExportFingerprint,
  loadLastExportFingerprint,
  replaceVersions,
} from "../engine/storage.js";
import { validateProjectImport } from "../engine/import-schema.js";
import { computeWorkspaceFingerprint } from "../engine/backup-fingerprint.js";
import { DEFAULT_STEPS, DEFAULT_TAKT, TEMPLATES } from "../data/templates.js";
import { INITIAL_ACTIVITY } from "../data/activity.js";

const DEFAULT_SETTINGS = {
  units: "sec",
  defaultTakt: 240,
  rounding: "1",
  refresh: "5s",
  theme: "light",
  accent: "#1E40AF",
  compact: false,
  grid: true,
  line: "LINE-07",
  shift: "SHIFT B",
  laborRate: 35,          // $/hr
  machineRate: 80,        // $/hr
  availableTimeMin: 420,  // minutes per shift
  demandPerShift: 100,
  kanbanSafetyPct: 20,
  // Profile
  profileName: "M. Becker",
  profileInitials: "MB",
  profileRole: "Process Engineer · Plant 3",
  profileEmail: "",
  profileAvatarColor: "#6D28D9",
  /** When true, each station ID is treated as one machine — overlapping work at that station is serialized in topo order */
  serializeStations: false,
};

function genId(prefix = "s") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

const stored = loadProject();
const storedSettings = loadSettings();

const initialSteps = stored?.steps?.length ? stored.steps : deepClone(DEFAULT_STEPS);
const initialTakt = stored?.taktTime ?? DEFAULT_TAKT;
const initialSidebarCollapsed = !!stored?.sidebarCollapsed;
const initialBuilderStepListHeightPx = Math.min(
  520,
  Math.max(180, Number(stored?.builderStepListHeightPx) || 300),
);

const MAX_HISTORY = 50;

export const useStore = create((set, get) => ({
  steps: initialSteps,
  taktTime: initialTakt,
  baselineSteps: stored?.baselineSteps ?? deepClone(DEFAULT_STEPS),
  selectedId: stored?.selectedId ?? initialSteps[0]?.id ?? null,
  settings: { ...DEFAULT_SETTINGS, ...(storedSettings || {}) },
  versions: loadVersions(),
  activity: stored?.activity ?? INITIAL_ACTIVITY.slice(),
  page: normalizePage(stored?.page || hashPage() || localStorage.getItem("cta_page") || "dashboard"),
  heatmap: stored?.heatmap ?? false,
  showDeps: stored?.showDeps !== false,
  highlightCriticalPath: stored?.highlightCriticalPath !== false,
  sidebarCollapsed: initialSidebarCollapsed,
  builderStepListHeightPx: initialBuilderStepListHeightPx,
  multilines: stored?.multilines || [],
  toasts: [],

  // Undo/redo history
  _past: [],
  _future: [],

  // Global modals
  palette: false,
  shortcuts: false,

  /** @type {{ open: boolean, title: string, body: string, danger?: boolean, confirmLabel?: string, cancelLabel?: string, onConfirm?: () => void }} */
  confirmDialog: { open: false, title: "", body: "" },
  exportBaselineFingerprint: loadLastExportFingerprint() || null,
  workspaceFingerprint: "",

  /* ---- navigation ---- */
  setPage: (page) => {
    page = normalizePage(page);
    localStorage.setItem("cta_page", page);
    if (typeof window !== "undefined") {
      window.location.hash = "#/" + page;
    }
    set({ page });
  },

  togglePalette: (force) => set(state => ({ palette: typeof force === "boolean" ? force : !state.palette })),
  toggleShortcuts: (force) => set(state => ({ shortcuts: typeof force === "boolean" ? force : !state.shortcuts })),

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: !!collapsed });
    get()._autosave();
  },
  toggleSidebarCollapsed: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
    get()._autosave();
  },
  setBuilderStepListHeightPx: (px) => {
    const n = Math.min(560, Math.max(160, Math.round(Number(px) || 300)));
    set({ builderStepListHeightPx: n });
    get()._autosave();
  },

  askConfirm: (opts) => set({
    confirmDialog: {
      open: true,
      title: opts.title || "Confirm",
      body: opts.body || "",
      danger: !!opts.danger,
      confirmLabel: opts.confirmLabel || "OK",
      cancelLabel: opts.cancelLabel || "Cancel",
      onConfirm: opts.onConfirm,
    },
  }),

  closeConfirm: () => set({ confirmDialog: { open: false, title: "", body: "" } }),

  _syncWorkspaceFingerprint: () => {
    const s = get();
    const fp = computeWorkspaceFingerprint({
      steps: s.steps,
      taktTime: s.taktTime,
      selectedId: s.selectedId,
      baselineSteps: s.baselineSteps,
      activity: s.activity,
      multilines: s.multilines,
      page: s.page,
      settings: s.settings,
      versions: s.versions,
    });
    let baseline = s.exportBaselineFingerprint;
    if (baseline === null) {
      const disk = loadLastExportFingerprint();
      baseline = disk || fp;
    }
    set({ workspaceFingerprint: fp, exportBaselineFingerprint: baseline });
  },

  needsExportReminder: () => {
    const s = get();
    if (!s.workspaceFingerprint || s.exportBaselineFingerprint === null) return false;
    return s.workspaceFingerprint !== s.exportBaselineFingerprint;
  },

  /* ---- history (undo/redo) ---- */
  _snapshot: () => ({ steps: deepClone(get().steps), taktTime: get().taktTime }),

  _push: (prev) => {
    const past = get()._past.concat([prev]).slice(-MAX_HISTORY);
    set({ _past: past, _future: [] });
  },

  undo: () => {
    const past = get()._past;
    if (!past.length) return;
    const prev = past[past.length - 1];
    const now = get()._snapshot();
    set({
      _past: past.slice(0, -1),
      _future: [now, ...get()._future].slice(0, MAX_HISTORY),
      steps: prev.steps,
      taktTime: prev.taktTime,
    });
    get()._autosave();
    get().toast("Undo", "info");
  },

  redo: () => {
    const future = get()._future;
    if (!future.length) return;
    const next = future[0];
    const now = get()._snapshot();
    set({
      _future: future.slice(1),
      _past: get()._past.concat([now]).slice(-MAX_HISTORY),
      steps: next.steps,
      taktTime: next.taktTime,
    });
    get()._autosave();
    get().toast("Redo", "info");
  },

  canUndo: () => get()._past.length > 0,
  canRedo: () => get()._future.length > 0,

  /* ---- mutators that record history ---- */
  setSteps: (steps) => {
    const prev = get()._snapshot();
    set({ steps });
    get()._push(prev);
    get()._autosave();
  },

  setTakt: (takt) => {
    const prev = get()._snapshot();
    const clamped = Math.max(5, Math.min(9999, Number(takt) || 0));
    set({ taktTime: clamped });
    get()._push(prev);
    get()._autosave();
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setHeatmap: (on) => set({ heatmap: on }),
  setShowDeps: (on) => set({ showDeps: on }),
  setHighlightCriticalPath: (on) => set({ highlightCriticalPath: on }),

  addStep: (step) => {
    const prev = get()._snapshot();
    const s = {
      id: step?.id || genId(),
      name: step?.name || "New Step",
      machineTime: step?.machineTime ?? 10,
      operatorTime: step?.operatorTime ?? 5,
      setupTime: step?.setupTime ?? 2,
      transferTime: step?.transferTime ?? 0,
      dependencies: step?.dependencies || [],
      groupId: step?.groupId || null,
      isValueAdded: step?.isValueAdded ?? true,
      stationId: step?.stationId || null,
      variability: step?.variability ?? 5,
      notes: step?.notes || "",
      wasteType: step?.wasteType || null, // muda / mura / muri
      setupInternal: step?.setupInternal ?? 0,
      setupExternal: step?.setupExternal ?? 0,
    };
    set(state => ({ steps: state.steps.concat([s]), selectedId: s.id }));
    get().pushActivity(`Added step "${s.name}"`, "edit");
    get()._push(prev);
    get()._autosave();
    return s;
  },

  updateStep: (id, patch) => {
    const prev = get()._snapshot();
    set(state => ({ steps: state.steps.map(s => s.id === id ? { ...s, ...patch } : s) }));
    get()._push(prev);
    get()._autosave();
  },

  removeStep: (id) => {
    const prev = get()._snapshot();
    const name = get().steps.find(s => s.id === id)?.name || id;
    set(state => ({
      steps: state.steps.filter(s => s.id !== id).map(s => ({ ...s, dependencies: (s.dependencies || []).filter(d => d !== id) })),
      selectedId: state.selectedId === id ? (state.steps[0]?.id || null) : state.selectedId,
    }));
    get().pushActivity(`Removed step "${name}"`, "edit");
    get()._push(prev);
    get()._autosave();
  },

  removeSteps: (ids) => {
    if (!ids?.length) return;
    const prev = get()._snapshot();
    set(state => ({
      steps: state.steps.filter(s => !ids.includes(s.id)).map(s => ({ ...s, dependencies: (s.dependencies || []).filter(d => !ids.includes(d)) })),
      selectedId: ids.includes(state.selectedId) ? (state.steps[0]?.id || null) : state.selectedId,
    }));
    get().pushActivity(`Removed ${ids.length} steps`, "edit");
    get()._push(prev);
    get()._autosave();
  },

  bulkAssignStation: (ids, stationId) => {
    const prev = get()._snapshot();
    set(state => ({ steps: state.steps.map(s => ids.includes(s.id) ? { ...s, stationId } : s) }));
    get().pushActivity(`Assigned ${ids.length} steps to ${stationId}`, "edit");
    get()._push(prev);
    get()._autosave();
  },

  bulkNudgeTime: (ids, field, delta) => {
    const prev = get()._snapshot();
    set(state => ({ steps: state.steps.map(s => ids.includes(s.id) ? { ...s, [field]: Math.max(0, (Number(s[field]) || 0) + delta) } : s) }));
    get()._push(prev);
    get()._autosave();
  },

  duplicateStep: (id) => {
    const src = get().steps.find(s => s.id === id);
    if (!src) return;
    const prev = get()._snapshot();
    const copy = { ...src, id: genId(), name: `${src.name} (copy)`, dependencies: [...(src.dependencies || [])] };
    set(state => {
      const idx = state.steps.findIndex(s => s.id === id);
      const next = state.steps.slice();
      next.splice(idx + 1, 0, copy);
      return { steps: next, selectedId: copy.id };
    });
    get()._push(prev);
    get()._autosave();
  },

  reorderSteps: (fromId, toId) => {
    if (fromId === toId) return;
    const prev = get()._snapshot();
    set(state => {
      const from = state.steps.findIndex(s => s.id === fromId);
      const to = state.steps.findIndex(s => s.id === toId);
      if (from < 0 || to < 0) return state;
      const next = state.steps.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return { steps: next };
    });
    get()._push(prev);
    get()._autosave();
  },

  addToGroup: (stepIds, groupId) => {
    if (!stepIds?.length) return;
    const prev = get()._snapshot();
    const gid = groupId || genId("g");
    set(state => ({ steps: state.steps.map(s => stepIds.includes(s.id) ? { ...s, groupId: gid } : s) }));
    get().pushActivity(`Grouped ${stepIds.length} steps into parallel group`, "edit");
    get()._push(prev);
    get()._autosave();
    return gid;
  },

  ungroup: (stepIds) => {
    if (!stepIds?.length) return;
    const prev = get()._snapshot();
    set(state => ({ steps: state.steps.map(s => stepIds.includes(s.id) ? { ...s, groupId: null } : s) }));
    get()._push(prev);
    get()._autosave();
  },

  setDependencies: (id, deps) => {
    const prev = get()._snapshot();
    set(state => ({ steps: state.steps.map(s => s.id === id ? { ...s, dependencies: [...new Set(deps)] } : s) }));
    get()._push(prev);
    get()._autosave();
  },

  replaceSteps: (newSteps) => {
    const prev = get()._snapshot();
    set({ steps: newSteps, selectedId: newSteps[0]?.id || null });
    get().pushActivity(`Loaded ${newSteps.length}-step process`, "imp");
    get()._push(prev);
    get()._autosave();
  },

  resetToBaseline: () => {
    const prev = get()._snapshot();
    const baseline = get().baselineSteps;
    set({ steps: deepClone(baseline) });
    get().pushActivity("Reset to baseline", "sys");
    get()._push(prev);
    get()._autosave();
  },

  setBaseline: (steps) => {
    set({ baselineSteps: deepClone(steps) });
    get()._autosave();
  },

  loadTemplate: (templateId) => {
    const t = TEMPLATES.find(x => x.id === templateId);
    if (!t) return;
    const prev = get()._snapshot();
    set({
      steps: deepClone(t.steps),
      baselineSteps: deepClone(t.steps),
      taktTime: t.taktTime,
      selectedId: t.steps[0]?.id,
    });
    get().pushActivity(`Loaded template "${t.name}"`, "imp");
    get()._push(prev);
    get()._autosave();
  },

  /* ---- SMED split ---- */
  applySMED: (id, internal, external) => {
    const prev = get()._snapshot();
    set(state => ({
      steps: state.steps.map(s => s.id === id ? {
        ...s,
        setupInternal: internal,
        setupExternal: external,
        setupTime: internal, // external setup happens in parallel → excluded from in-line setup
      } : s),
    }));
    get().pushActivity(`SMED split applied (int ${internal}s / ext ${external}s)`, "edit");
    get()._push(prev);
    get()._autosave();
  },

  /* ---- versions ---- */
  saveNewVersion: (label) => {
    const project = { steps: get().steps, taktTime: get().taktTime, settings: get().settings };
    const v = saveVersion(label, project);
    set({ versions: loadVersions() });
    get().pushActivity(`Saved version ${v.label}`, "save");
    get().toast(`Saved ${v.label}`, "success");
    return v;
  },

  restoreVersion: (id) => {
    const v = get().versions.find(v => v.id === id);
    if (!v) return;
    const prev = get()._snapshot();
    set({ steps: deepClone(v.project.steps || []), taktTime: v.project.taktTime ?? get().taktTime });
    get().pushActivity(`Restored version ${v.label}`, "sys");
    get().toast(`Restored ${v.label}`, "success");
    get()._push(prev);
    get()._autosave();
  },

  deleteVersion: (id) => {
    const next = deleteVersion(id);
    set({ versions: next });
  },

  /* ---- settings ---- */
  setSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    saveSettings(next);
    applyThemeDom(next);
  },

  pushActivity: (text, tag = "edit", who) => {
    const author = who || get().settings?.profileName || "User";
    set(state => ({ activity: [{ when: "now", who: author, act: text, tag }, ...state.activity].slice(0, 40) }));
  },

  addLineSnapshot: (label) => {
    const snap = { id: genId("line"), label: label || `Line-${Date.now() % 1000}`, steps: deepClone(get().steps), taktTime: get().taktTime };
    set(state => ({ multilines: state.multilines.concat(snap) }));
    get()._autosave();
    return snap;
  },

  removeLineSnapshot: (id) => {
    set(state => ({ multilines: state.multilines.filter(m => m.id !== id) }));
    get()._autosave();
  },

  toast: (msg, kind = "info") => {
    const id = Math.random().toString(36).slice(2, 8);
    set(state => ({ toasts: state.toasts.concat([{ id, msg, kind }]) }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 2800);
  },

  resetAll: () => {
    set({
      steps: deepClone(DEFAULT_STEPS),
      baselineSteps: deepClone(DEFAULT_STEPS),
      taktTime: DEFAULT_TAKT,
      selectedId: DEFAULT_STEPS[0]?.id,
      versions: [],
      multilines: [],
      _past: [],
      _future: [],
    });
    localStorage.removeItem("cta_project_v1");
    localStorage.removeItem("cta_versions_v1");
    saveLastExportFingerprint("");
    set({ exportBaselineFingerprint: null });
    get().pushActivity("Data reset to defaults", "sys");
    get()._syncWorkspaceFingerprint();
  },

  _autosave: () => {
    const {
      steps, taktTime, selectedId, baselineSteps, activity, multilines, page,
      heatmap, showDeps, highlightCriticalPath, sidebarCollapsed, builderStepListHeightPx,
    } = get();
    saveProject({
      steps, taktTime, selectedId, baselineSteps, activity, multilines, page,
      heatmap, showDeps, highlightCriticalPath, sidebarCollapsed, builderStepListHeightPx,
    });
    get()._syncWorkspaceFingerprint();
  },

  /* ---- JSON project export / import ---- */
  exportProjectJSON: () => {
    const { steps, taktTime, baselineSteps, settings, versions, multilines } = get();
    const blob = { _type: "cta-project", version: 2, steps, taktTime, baselineSteps, settings, versions, multilines, exportedAt: new Date().toISOString() };
    const dataStr = JSON.stringify(blob, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `cta-project-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    get()._syncWorkspaceFingerprint();
    const fp = get().workspaceFingerprint;
    saveLastExportFingerprint(fp);
    set({ exportBaselineFingerprint: fp });
    get().toast("Project exported as JSON", "success");
  },

  importProjectJSON: async (file) => {
    try {
      const text = await file.text();
      let obj;
      try {
        obj = JSON.parse(text);
      } catch {
        get().toast("Import failed: file is not valid JSON.", "error");
        return;
      }
      const validated = validateProjectImport(obj);
      if (!validated.ok) {
        get().toast("Import failed: " + validated.error, "error");
        return;
      }
      const { steps, taktTime, baselineSteps, multilines, settings: impSettings, versions: impVers } = validated.data;
      const prev = get()._snapshot();
      const nextVersions = impVers != null ? impVers : loadVersions();
      if (impVers != null) replaceVersions(impVers);
      set({
        steps,
        taktTime,
        baselineSteps,
        multilines,
        selectedId: steps[0]?.id ?? null,
        versions: nextVersions,
      });
      if (impSettings) get().setSettings(impSettings);
      get().pushActivity(`Imported JSON project (${steps.length} steps)`, "imp");
      get()._push(prev);
      get()._autosave();
      get().toast("Project imported", "success");
    } catch (e) {
      get().toast("Import failed: " + (e?.message || String(e)), "error");
    }
  },
}));

function normalizePage(p) {
  const valid = ["dashboard", "builder", "gantt", "analytics", "sim", "reports", "settings", "tools"];
  return valid.includes(p) ? p : "dashboard";
}

function hashPage() {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.replace(/^#\/?/, "");
  return h ? h.split("?")[0] : null;
}

function applyThemeDom(settings) {
  if (typeof document === "undefined") return;
  const b = document.body;
  b.classList.toggle("theme-dark", settings.theme === "dark");
  b.classList.toggle("compact", !!settings.compact);
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    applyThemeDom(useStore.getState().settings);
    useStore.getState()._syncWorkspaceFingerprint();
  }, 0);
  // Listen to hash changes for back/forward
  window.addEventListener("hashchange", () => {
    const hp = hashPage();
    if (hp) useStore.setState({ page: normalizePage(hp) });
  });
  // Initial sync: if URL hash was set, use it
  const hp = hashPage();
  if (hp) useStore.setState({ page: normalizePage(hp) });
  // Surface any storage issues as toasts
  onStorageError((msg) => {
    useStore.getState().toast(msg, "error");
  });
}
