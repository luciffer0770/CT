/**
 * Stable fingerprint of persisted workspace state for "dirty vs last export" checks.
 */

function sortKeysDeep(x) {
  if (x === null || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(sortKeysDeep);
  const out = {};
  for (const k of Object.keys(x).sort()) {
    out[k] = sortKeysDeep(x[k]);
  }
  return out;
}

export function computeWorkspaceFingerprint(snapshot) {
  const {
    steps,
    taktTime,
    selectedId,
    baselineSteps,
    activity,
    multilines,
    page,
    settings,
    versions,
  } = snapshot;
  const payload = sortKeysDeep({
    steps,
    taktTime,
    selectedId,
    baselineSteps,
    activity,
    multilines,
    page,
    settings,
    versions,
  });
  return JSON.stringify(payload);
}
