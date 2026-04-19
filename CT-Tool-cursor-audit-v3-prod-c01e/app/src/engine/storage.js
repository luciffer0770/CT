// localStorage persistence
const KEY = "cta_project_v1";
const KEY_VERS = "cta_versions_v1";
const KEY_SETTINGS = "cta_settings_v1";
const KEY_EXPORT_FP = "cta_last_export_fp_v1";

const listeners = new Set();
export function onStorageError(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(msg, err) {
  listeners.forEach(l => {
    try {
      l(msg, err);
    } catch {
      /* listener failed */
    }
  });
}

function isQuota(e) {
  if (!e) return false;
  return e.name === "QuotaExceededError" || /quota|storage/i.test(String(e.message || e));
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuota(e)) {
      emit("Local storage is full. Delete old versions or export your project.", e);
    } else {
      emit("Could not save to local storage.", e);
    }
    console.warn("[cta] storage.set failed", e);
    return false;
  }
}

export function saveProject(project) {
  return safeSet(KEY, JSON.stringify(project));
}

export function loadProject() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[cta] loadProject failed", e);
    return null;
  }
}

export function saveVersion(label, project) {
  const versions = loadVersions();
  const version = {
    id: `v${Date.now()}`,
    label: label || `v${versions.length + 1}`,
    date: new Date().toISOString(),
    project,
  };
  versions.unshift(version);
  safeSet(KEY_VERS, JSON.stringify(versions.slice(0, 50)));
  return version;
}

export function loadVersions() {
  try {
    const raw = localStorage.getItem(KEY_VERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteVersion(id) {
  const versions = loadVersions().filter(v => v.id !== id);
  safeSet(KEY_VERS, JSON.stringify(versions));
  return versions;
}

/** Replace the full version list (e.g. after JSON import). */
export function replaceVersions(versions) {
  const list = Array.isArray(versions) ? versions.slice(0, 50) : [];
  safeSet(KEY_VERS, JSON.stringify(list));
  return list;
}

export function saveSettings(s) {
  safeSet(KEY_SETTINGS, JSON.stringify(s));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KEY_VERS);
  localStorage.removeItem(KEY_SETTINGS);
  localStorage.removeItem(KEY_EXPORT_FP);
}

export function saveLastExportFingerprint(fp) {
  if (typeof fp !== "string" || !fp) return false;
  return safeSet(KEY_EXPORT_FP, fp);
}

export function loadLastExportFingerprint() {
  try {
    return localStorage.getItem(KEY_EXPORT_FP) || "";
  } catch {
    return "";
  }
}

export function storageUsage() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || "";
      bytes += (k.length + v.length) * 2; // utf-16 approximation
    }
  } catch {
    /* quota estimate unavailable */
  }
  return bytes;
}
