import { useMemo, useState, useEffect } from "react";
import Icon from "../components/Icon.jsx";
import Gantt from "../components/Gantt.jsx";
import PageCrumbs from "../components/PageCrumbs.jsx";
import { useStore } from "../store/useStore.js";
import { exportReportToPDF } from "../engine/pdf-lazy.js";
import { exportStepsToExcel } from "../engine/excel-lazy.js";
import { computeSchedule } from "../engine/calc.js";
import { paretoSteps, costPerUnit, suggestOptimization } from "../engine/analytics.js";

const REPORT_SECTIONS_KEY = "cta_report_sections_v1";

const defaultSections = () => ({
  kpi: true,
  steps: true,
  gantt: true,
  pareto: true,
  cost: true,
  critical: true,
  notes: true,
});

function loadReportSections() {
  try {
    const raw = localStorage.getItem(REPORT_SECTIONS_KEY);
    if (!raw) return defaultSections();
    return { ...defaultSections(), ...JSON.parse(raw) };
  } catch {
    return defaultSections();
  }
}

export default function Reports({ schedule }) {
  const versions = useStore(s => s.versions);
  const settings = useStore(s => s.settings);
  const steps = useStore(s => s.steps);
  const taktTime = useStore(s => s.taktTime);
  const restoreVersion = useStore(s => s.restoreVersion);
  const toast = useStore(s => s.toast);
  const highlightCriticalPath = useStore(s => s.highlightCriticalPath);

  const [selectedReport, setSelectedReport] = useState(0);
  const [page, setPage] = useState(1);
  const [sections, setSections] = useState(loadReportSections);

  useEffect(() => {
    try {
      localStorage.setItem(REPORT_SECTIONS_KEY, JSON.stringify(sections));
    } catch { /* ignore */ }
  }, [sections]);

  const toggleSection = (key) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const reportList = useMemo(() => {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const base = [
      { id: `R-${fmt(today)}-${settings.shift?.replace(/\s+/g, "") || "CUR"}`, name: `${settings.shift || "Current"} · ${today.toLocaleDateString()}`, status: "open" },
    ];
    const fromVers = versions.slice(0, 12).map((v) => ({
      id: `R-${v.id}`, name: v.label + " — " + new Date(v.date).toLocaleString(), status: "ready", version: v,
    }));
    return base.concat(fromVers);
  }, [versions, settings.shift]);

  const selected = reportList[selectedReport] || reportList[0];

  const reportSchedule = useMemo(() => {
    if (selected?.version) {
      return computeSchedule(selected.version.project.steps || [], selected.version.project.taktTime || taktTime);
    }
    return schedule;
  }, [selected, schedule, taktTime]);

  const schedOpts = useMemo(() => {
    const stationMeta = {};
    if (settings.serializeStations) {
      const seen = new Set();
      const src = selected?.version ? (selected.version.project.steps || []) : steps;
      src.forEach((st) => {
        const sid = st.stationId;
        if (sid && !seen.has(sid)) {
          seen.add(sid);
          stationMeta[sid] = { machines: 1 };
        }
      });
    }
    return { serializeStations: !!settings.serializeStations, stationMeta };
  }, [settings.serializeStations, selected, steps]);

  const reportScheduleConstrained = useMemo(
    () => (selected?.version
      ? computeSchedule(selected.version.project.steps || [], selected.version.project.taktTime || taktTime, schedOpts)
      : computeSchedule(steps, taktTime, schedOpts)),
    [selected, steps, taktTime, schedOpts],
  );

  const displaySchedule = settings.serializeStations ? reportScheduleConstrained : reportSchedule;

  const pareto = useMemo(() => paretoSteps(displaySchedule.steps), [displaySchedule]);
  const cost = useMemo(() => costPerUnit(displaySchedule.steps, { laborRate: settings.laborRate, machineRate: settings.machineRate }), [displaySchedule, settings.laborRate, settings.machineRate]);

  const insights = useMemo(() => {
    const src = selected?.version ? (selected.version.project.steps || []) : steps;
    return suggestOptimization(src, displaySchedule.takt).slice(0, 5).map((x) => x.message);
  }, [selected, steps, displaySchedule.takt]);

  const TOTAL_PAGES = 3;

  const onExportPDF = () => {
    exportReportToPDF({
      project: {
        line: settings.line,
        shift: settings.shift,
        versionCount: versions.length,
        author: settings.profileName,
        role: settings.profileRole,
        email: settings.profileEmail,
      },
      schedule: displaySchedule,
      reportId: selected?.id || `R-${Date.now()}`,
      title: `Cycle Time Report — ${settings.line} · ${settings.shift}`,
      insights,
    });
  };

  return (
    <>
      <PageCrumbs line={settings.line} pageTitle="REPORTS" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <div className="page-sub">Pick sections for preview and PDF; exports use the same line as the preview.</div>
        </div>
        <div className="toolbar">
          {selected?.version && (
            <button className="btn" onClick={() => { restoreVersion(selected.version.id); toast(`Restored ${selected.version.label} to live line`, "success"); }}>
              <Icon name="history" size={13}/> Restore this version
            </button>
          )}
          <button className="btn" onClick={() => window.print()}><Icon name="report" size={13}/> Print</button>
          <button
            className="btn"
            onClick={() => exportStepsToExcel(
              selected?.version ? (selected.version.project.steps || []) : steps,
              displaySchedule,
              `cta-report-${(selected?.id || "export").replace(/[^\w.-]+/g, "_")}.xlsx`,
            )}
          ><Icon name="download" size={13}/> Export Excel</button>
          <button className="btn primary" onClick={onExportPDF}><Icon name="download" size={13}/> Export PDF</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head"><h3>Report contents</h3><span className="sub">PREVIEW + PDF</span></div>
        <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", fontSize: 11 }}>
          {[
            ["kpi", "KPI strip"], ["steps", "Step table"], ["gantt", "Gantt"], ["pareto", "Pareto"],
            ["cost", "Cost / throughput"], ["critical", "Critical path"], ["notes", "Step notes"],
          ].map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={!!sections[k]} onChange={() => toggleSection(k)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="section-row">
        <div className="card col-4">
          <div className="card-head"><h3>Saved Reports</h3><span className="sub">{reportList.length}</span></div>
          <div className="card-body" style={{ padding: 0, maxHeight: 620, overflow: "auto" }}>
            {reportList.map((r, i) => (
              <div
                key={r.id}
                className="report-row"
                onClick={() => { setSelectedReport(i); setPage(1); }}
                style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: i === selectedReport ? "var(--blue-50)" : "transparent" }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{r.id}</div>
                </div>
                <span className={`tag ${r.status === "open" ? "blue" : "green"}`}>{r.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-8">
          <div className="card-head">
            <div>
              <h3>Preview — {selected?.id}</h3>
              <div className="sub" style={{ marginTop: 2 }}>{settings.shift} · {settings.line} · {new Date().toLocaleDateString()}</div>
            </div>
            <div className="toolbar">
              <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><Icon name="chev-left" size={13}/></button>
              <button className="btn ghost" title="Current page">Page {page} / {TOTAL_PAGES}</button>
              <button className="btn" onClick={() => setPage(p => Math.min(TOTAL_PAGES, p + 1))} disabled={page >= TOTAL_PAGES}><Icon name="chev-right" size={13}/></button>
            </div>
          </div>
          <div className="card-body" style={{ background: "var(--bg-2)", padding: 16 }}>
            <div className="report-paper" style={{ background: "white", padding: 28, boxShadow: "var(--shadow-md)", border: "1px solid var(--border)", borderTop: "3px solid var(--blue)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="mono muted" style={{ fontSize: 10, letterSpacing: ".14em" }}>CYCLE TIME REPORT</div>
                  <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, margin: "4px 0 0", fontWeight: 600, color: "#0B1020" }}>{settings.line} · {settings.shift}</h2>
                  <div style={{ fontSize: 12, color: "#5B6274", marginTop: 4 }}>
                    Prepared by {settings.profileName || "—"}{settings.profileRole ? `, ${settings.profileRole}` : ""}
                  </div>
                  {settings.profileEmail && <div className="mono" style={{ fontSize: 10, color: "#5B6274", marginTop: 2 }}>{settings.profileEmail}</div>}
                </div>
                <div className="mono muted" style={{ textAlign: "right", fontSize: 10, color: "#5B6274" }}>
                  <div>DATE&nbsp;&nbsp;&nbsp;{new Date().toLocaleDateString()}</div>
                  <div>REV&nbsp;&nbsp;&nbsp;&nbsp;v{versions.length}</div>
                  <div>ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{selected?.id}</div>
                </div>
              </div>

              {sections.kpi && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 18 }}>
                  {[
                    { k: "CYCLE TIME", v: displaySchedule.totalCycleTime + "s", c: "var(--blue)" },
                    { k: "TAKT", v: displaySchedule.takt + "s", c: "#0B1020" },
                    { k: "EFFICIENCY", v: displaySchedule.efficiency + "%", c: "var(--green)" },
                    { k: "BOTTLENECK", v: displaySchedule.bottleneck?.name?.split(" ")[0] || "—", c: "var(--red)", small: true },
                  ].map(m => (
                    <div key={m.k} style={{ border: "1px solid #E2E6EF", padding: "10px 12px" }}>
                      <div className="mono muted" style={{ fontSize: 9, letterSpacing: ".12em" }}>{m.k}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: m.small ? 14 : 22, fontWeight: 600, color: m.c, marginTop: 2 }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {page === 1 && (
                <>
                  {sections.steps ? (
                  <>
                  <h3 style={headStyle}>Step Breakdown</h3>
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Step</th><th style={{ textAlign: "right" }}>M</th><th style={{ textAlign: "right" }}>Op</th><th style={{ textAlign: "right" }}>Set</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Wait</th><th style={{ textAlign: "right" }}>CP%</th></tr></thead>
                    <tbody>
                      {displaySchedule.steps.map((s, i) => (
                        <tr key={s.id}>
                          <td className="num" style={{ color: "#8A92A6" }}>{String(i + 1).padStart(2, "0")}</td>
                          <td style={{ color: "#0B1020" }}>{s.name}</td>
                          <td className="num" style={{ textAlign: "right" }}>{s.machineTime}</td>
                          <td className="num" style={{ textAlign: "right" }}>{s.operatorTime}</td>
                          <td className="num" style={{ textAlign: "right" }}>{s.setupTime}</td>
                          <td className="num" style={{ textAlign: "right", fontWeight: 600, color: s.bottleneck ? "var(--red)" : "#0B1020" }}>{s.cycleTime}s</td>
                          <td className="num" style={{ textAlign: "right", color: s.waitTime > 0 ? "var(--red)" : "#8A92A6" }}>{s.waitTime}s</td>
                          <td className="num" style={{ textAlign: "right", fontSize: 10 }}>{s.critical ? `${(s.criticalPathPct || 0).toFixed(1)}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </>
                  ) : <div className="muted" style={{ marginTop: 18 }}>Step table hidden — enable &quot;Step table&quot; above.</div>}
                </>
              )}

              {page === 2 && (
                <>
                  {sections.gantt && (
                    <>
                      <h3 style={headStyle}>Gantt Snapshot</h3>
                      <div style={{ border: "1px solid #E2E6EF", padding: 8 }}>
                        <Gantt steps={displaySchedule.steps} totalCT={displaySchedule.totalCycleTime} takt={displaySchedule.takt} tickEvery={40} labelWidth={130} highlightCritical={highlightCriticalPath}/>
                      </div>
                    </>
                  )}
                  {sections.pareto && (
                    <>
                      <h3 style={headStyle}>Pareto (80/20)</h3>
                      <table className="tbl">
                        <thead><tr><th>#</th><th>Step</th><th style={{ textAlign: "right" }}>Cycle</th><th style={{ textAlign: "right" }}>Cumulative</th><th>Zone</th></tr></thead>
                        <tbody>
                          {pareto.map((d, i) => (
                            <tr key={d.id}>
                              <td className="num muted">#{i + 1}</td>
                              <td>{d.name}</td>
                              <td className="num" style={{ textAlign: "right" }}>{d.value}s</td>
                              <td className="num" style={{ textAlign: "right" }}>{d.cumPct.toFixed(1)}%</td>
                              <td>{d.cumPct <= 80 ? <span className="tag red">VITAL FEW</span> : <span className="tag green">USEFUL MANY</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  {!sections.gantt && !sections.pareto && <div className="muted" style={{ marginTop: 18 }}>Gantt and Pareto hidden — enable in Report contents.</div>}
                </>
              )}

              {page === 3 && (
                <>
                  {sections.cost && (
                    <>
                      <h3 style={headStyle}>Cost &amp; Throughput</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        <ReportTile k="Labour / unit" v={`$${cost.labor.toFixed(3)}`}/>
                        <ReportTile k="Machine / unit" v={`$${cost.machine.toFixed(3)}`}/>
                        <ReportTile k="Total / unit" v={`$${cost.total.toFixed(2)}`}/>
                        <ReportTile k="Units / hour" v={Math.floor(3600 / Math.max(1, displaySchedule.takt))}/>
                        <ReportTile k="Labour rate" v={`$${settings.laborRate}/hr`}/>
                        <ReportTile k="Machine rate" v={`$${settings.machineRate}/hr`}/>
                      </div>
                    </>
                  )}
                  {sections.critical && (
                    <>
                      <h3 style={headStyle}>Critical Path</h3>
                      <div style={{ fontSize: 12, color: "#0B1020" }}>
                        {displaySchedule.steps.filter(s => s.critical).map(s => s.name).join("  →  ") || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
                        Path work sum: {displaySchedule.criticalPathWorkSum ?? "—"}s · Project CT: {displaySchedule.totalCycleTime}s
                      </div>
                    </>
                  )}
                  {sections.notes && (
                    <>
                      <h3 style={headStyle}>Notes</h3>
                      <div style={{ fontSize: 12, color: "#0B1020", display: "grid", gap: 6 }}>
                        {displaySchedule.steps.filter(s => s.notes).map(s => (
                          <div key={s.id}><b>{s.name}:</b> <span style={{ color: "#5B6274" }}>{s.notes}</span></div>
                        ))}
                        {displaySchedule.steps.every(s => !s.notes) && <div style={{ color: "#8A92A6" }}>— no notes recorded —</div>}
                      </div>
                    </>
                  )}
                  {!sections.cost && !sections.critical && !sections.notes && <div className="muted" style={{ marginTop: 18 }}>Page 3 sections hidden — enable cost, critical path, or notes.</div>}
                </>
              )}

              <div className="mono muted" style={{ marginTop: 22, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8A92A6" }}>
                <span>CYCLE TIME ANALYZER · INDUSTRIAL EDITION</span>
                <span>PAGE {page} / {TOTAL_PAGES}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const headStyle = { fontFamily: "var(--font-head)", fontSize: 13, marginTop: 22, marginBottom: 8, letterSpacing: ".04em", textTransform: "uppercase", color: "#5B6274" };

function ReportTile({ k, v }) {
  return (
    <div style={{ border: "1px solid #E2E6EF", padding: "10px 12px" }}>
      <div className="mono muted" style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" }}>{k}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: "#0B1020" }}>{v}</div>
    </div>
  );
}
