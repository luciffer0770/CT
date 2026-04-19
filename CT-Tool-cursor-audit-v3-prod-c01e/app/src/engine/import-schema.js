/**
 * Validates Cycle Time Analyzer project JSON before it touches the store.
 * No external deps — keeps the main bundle small.
 */

function isObj(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function str(x, fallback = "") {
  if (x === undefined || x === null) return fallback;
  return String(x);
}

function arr(x) {
  return Array.isArray(x) ? x : [];
}

/** Normalize a single step to the shape the app expects (drops unknown fields). */
export function normalizeStep(raw, idx) {
  const r = isObj(raw) ? raw : {};
  const id = str(r.id, `imported-${idx}`);
  return {
    id,
    name: str(r.name, `Step ${idx + 1}`),
    machineTime: num(r.machineTime, 0),
    operatorTime: num(r.operatorTime, 0),
    setupTime: num(r.setupTime, 0),
    transferTime: num(r.transferTime, 0),
    dependencies: arr(r.dependencies).map(d => str(d)).filter(Boolean),
    groupId: r.groupId == null ? null : str(r.groupId),
    isValueAdded: r.isValueAdded !== undefined ? !!r.isValueAdded : true,
    stationId: r.stationId == null ? null : str(r.stationId),
    variability: num(r.variability, 0),
    notes: str(r.notes, ""),
    wasteType: r.wasteType == null ? null : str(r.wasteType),
    setupInternal: num(r.setupInternal, 0),
    setupExternal: num(r.setupExternal, 0),
  };
}

/**
 * @param {unknown} obj
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateProjectImport(obj) {
  if (!isObj(obj)) {
    return { ok: false, error: "File is not a JSON object." };
  }
  if (obj._type !== "cta-project") {
    return { ok: false, error: 'Not a Cycle Time Analyzer project (missing "_type": "cta-project").' };
  }
  const ver = num(obj.version, 0);
  if (ver < 1 || ver > 99) {
    return { ok: false, error: `Unsupported project format version (${obj.version}).` };
  }
  const stepsRaw = arr(obj.steps);
  if (stepsRaw.length === 0) {
    return { ok: false, error: "Project has no steps." };
  }
  if (stepsRaw.length > 2000) {
    return { ok: false, error: "Project has too many steps (max 2000)." };
  }
  const steps = stepsRaw.map((s, i) => normalizeStep(s, i));
  const ids = new Set(steps.map(s => s.id));
  if (ids.size !== steps.length) {
    return { ok: false, error: "Duplicate step ids in import file." };
  }
  for (const s of steps) {
    for (const d of s.dependencies) {
      if (!ids.has(d)) {
        return { ok: false, error: `Step "${s.name}" depends on unknown id "${d}".` };
      }
      if (d === s.id) {
        return { ok: false, error: `Step "${s.name}" cannot depend on itself.` };
      }
    }
  }
  const taktTime = Math.max(5, Math.min(9999, num(obj.taktTime, 240)));
  const baselineRaw = arr(obj.baselineSteps);
  const baselineSteps = baselineRaw.length
    ? baselineRaw.map((s, i) => normalizeStep(s, i))
    : steps.slice();

  const multilines = arr(obj.multilines)
    .slice(0, 100)
    .map((m, i) => normalizeMultiline(m, i))
    .filter(Boolean);

  const versions = Array.isArray(obj.versions)
    ? arr(obj.versions).slice(0, 60).map((v, i) => normalizeVersion(v, i)).filter(Boolean)
    : null;

  return {
    ok: true,
    data: {
      steps,
      taktTime,
      baselineSteps,
      multilines,
      settings: isObj(obj.settings) ? obj.settings : null,
      versions,
    },
  };
}

function normalizeMultiline(raw, idx) {
  if (!isObj(raw)) return null;
  const stepsRaw = arr(raw.steps);
  if (!stepsRaw.length) return null;
  const stepsM = stepsRaw.map((s, i) => normalizeStep(s, i));
  const mids = new Set(stepsM.map(s => s.id));
  if (mids.size !== stepsM.length) return null;
  for (const s of stepsM) {
    for (const d of s.dependencies) {
      if (!mids.has(d)) return null;
    }
  }
  return {
    id: str(raw.id, `line-${idx}`),
    label: str(raw.label, `Line ${idx + 1}`),
    steps: stepsM,
    taktTime: Math.max(5, Math.min(9999, num(raw.taktTime, 240))),
  };
}

function normalizeVersion(raw, idx) {
  if (!isObj(raw)) return null;
  const proj = raw.project;
  if (!isObj(proj)) return null;
  const stepsRaw = arr(proj.steps);
  if (!stepsRaw.length) return null;
  const stepsV = stepsRaw.map((s, i) => normalizeStep(s, i));
  const vids = new Set(stepsV.map(s => s.id));
  if (vids.size !== stepsV.length) return null;
  for (const s of stepsV) {
    for (const d of s.dependencies) {
      if (!vids.has(d)) return null;
    }
  }
  return {
    id: str(raw.id, `v-import-${idx}`),
    label: str(raw.label, `v${idx + 1}`),
    date: str(raw.date, new Date().toISOString()),
    project: {
      steps: stepsV,
      taktTime: Math.max(5, Math.min(9999, num(proj.taktTime, 240))),
      settings: isObj(proj.settings) ? proj.settings : undefined,
    },
  };
}
