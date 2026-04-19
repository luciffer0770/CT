import { useEffect, useMemo, useState } from "react";
import { loadLogicalFields, importStepsFromMapping } from "../engine/excel-lazy.js";

/**
 * Review Excel column mapping, see validation issues, import with optional partial recovery.
 */
export default function ExcelImportModal({ open, data, onClose, onImported }) {
  const [fields, setFields] = useState([]);
  const [mapping, setMapping] = useState({});

  useEffect(() => {
    if (!open || !data) return;
    loadLogicalFields().then(setFields);
    setMapping({ ...data.suggestedMapping });
  }, [open, data]);

  const headerOptions = useMemo(() => {
    const h = data?.headers || [];
    return [{ value: "", label: "— skip —" }, ...h.map((x) => ({ value: x, label: x }))];
  }, [data]);

  if (!open || !data) return null;

  const setField = (key, headerValue) => {
    setMapping((m) => ({ ...m, [key]: headerValue || undefined }));
  };

  const runImport = async (allowPartial) => {
    const { steps, issues } = await importStepsFromMapping(data.buffer, mapping, data.fileName || "");
    const errors = issues.filter((i) => i.severity === "error");
    const warns = issues.filter((i) => i.severity === "warn");
    if (errors.length && !allowPartial) {
      onImported?.({ ok: false, steps: [], issues, message: errors[0]?.msg || "Adjust mapping or use “allow warnings”" });
      return;
    }
    onImported?.({ ok: true, steps, issues, warns });
  };

  const errCount = data.issues.filter((i) => i.severity === "error").length;
  const warnCount = data.issues.filter((i) => i.severity === "warn").length;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal lg excel-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-import-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="excel-import-title">Import spreadsheet</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: "70vh", overflow: "auto" }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Map your columns to fields. Headers were detected from the first row with multiple columns.
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {fields.map((f) => (
              <label
                key={f.key}
                style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 8, fontSize: 12 }}
              >
                <span>{f.label}</span>
                <select
                  className="input"
                  style={{ height: 32 }}
                  value={mapping[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                >
                  {headerOptions.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {(errCount > 0 || warnCount > 0) && (
            <div className="card" style={{ marginBottom: 12, borderColor: errCount ? "rgba(225,29,46,.35)" : "var(--border)" }}>
              <div className="card-head">
                <h3>Checks</h3>
                <span className="tag">{errCount} err · {warnCount} warn</span>
              </div>
              <div className="card-body" style={{ fontSize: 11, maxHeight: 120, overflow: "auto" }}>
                {data.issues.slice(0, 40).map((iss, i) => (
                  <div
                    key={i}
                    style={{
                      color: iss.severity === "error" ? "var(--red)" : "var(--ink-3)",
                      marginBottom: 4,
                    }}
                  >
                    Row {iss.row} {iss.field ? `· ${iss.field}` : ""}: {iss.msg}
                  </div>
                ))}
                {data.issues.length > 40 && <div className="muted">…</div>}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h3>Preview (first 5 rows)</h3>
            </div>
            <div className="card-body" style={{ fontSize: 11, overflow: "auto" }}>
              <table className="mini-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 4 }}>ID</th>
                    <th style={{ textAlign: "left", padding: 4 }}>Name</th>
                    <th style={{ textAlign: "right", padding: 4 }}>M</th>
                    <th style={{ textAlign: "right", padding: 4 }}>Op</th>
                  </tr>
                </thead>
                <tbody>
                  {data.previewSteps.map((s) => (
                    <tr key={s.id}>
                      <td style={{ padding: 4, fontFamily: "var(--font-mono)" }}>{s.id}</td>
                      <td style={{ padding: 4 }}>{s.name}</td>
                      <td style={{ padding: 4, textAlign: "right" }}>{s.machineTime}</td>
                      <td style={{ padding: 4, textAlign: "right" }}>{s.operatorTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="modal-foot" style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => runImport(true)} title="Import valid rows; unknown deps may remain as warnings">
            Import (allow warnings)
          </button>
          <button type="button" className="btn primary" onClick={() => runImport(false)}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
