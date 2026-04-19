import React, { useMemo } from "react";
import Icon from "../components/Icon.jsx";
import Gantt from "../components/Gantt.jsx";
import { Spark } from "../components/Charts.jsx";
import { useStore } from "../store/useStore.js";
import { exportKPIsToPDF } from "../engine/pdf-lazy.js";
import { exportStepsToExcel } from "../engine/excel-lazy.js";
import { calculateOEE } from "../engine/analytics.js";

export default function Dashboard({ schedule }) {
  const activity = useStore(s => s.activity);
  const setPage = useStore(s => s.setPage);
  const setSelectedId = useStore(s => s.setSelectedId);
  const taktTime = useStore(s => s.taktTime);
  const steps = useStore(s => s.steps);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const resetToBaseline = useStore(s => s.resetToBaseline);
  const askConfirm = useStore(s => s.askConfirm);

  const { totalCycleTime, efficiency, bottleneck, vaPct, nvaPct } = schedule;

  const trend = useMemo(() => {
    const base = totalCycleTime;
    return [base - 25, base - 18, base - 11, base - 5, base - 2, base + 1, base - 3, base, base];
  }, [totalCycleTime]);
  const effTrend = useMemo(() => {
    const base = efficiency || 1;
    return [base - 4, base - 2, base - 5, base - 1, base + 2, base - 1, base + 1, base, base].map(v => Math.max(0, v));
  }, [efficiency]);

  const oee = calculateOEE({ availability: 92, performance: Math.min(99, efficiency || 80), quality: 98.5 });

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> DASHBOARD</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Production Dashboard</h1>
          <div className="page-sub">Real-time overview of cycle time, efficiency and critical path for Line 07.</div>
        </div>
        <div className="toolbar">
          <button
            className="btn"
            onClick={() => askConfirm({
              title: "Reset to baseline?",
              body: "Replace the current steps with your saved baseline?",
              confirmLabel: "Reset to baseline",
              onConfirm: () => resetToBaseline(),
            })}
          ><Icon name="reset" size={13}/> Reset</button>
          <button className="btn" onClick={() => exportStepsToExcel(steps, schedule)}><Icon name="download" size={13}/> Export .xlsx</button>
          <button className="btn primary" onClick={() => exportKPIsToPDF({ schedule })}><Icon name="download" size={13}/> Export snapshot</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi accent-blue">
          <div className="kpi-top"><div className="lbl">Total Cycle Time</div><span className="delta down"><Icon name="arrow-down" size={10}/> 3.2%</span></div>
          <div className="val">{totalCycleTime}<span className="u">s</span></div>
          <div className="spark"><Spark data={trend} color="#1E40AF"/></div>
        </div>
        <div className="kpi accent-green">
          <div className="kpi-top"><div className="lbl">Line Efficiency</div><span className="delta up"><Icon name="arrow-up" size={10}/> 1.4%</span></div>
          <div className="val">{efficiency}<span className="u">%</span></div>
          <div className="spark"><Spark data={effTrend} color="#22C55E"/></div>
        </div>
        <div className="kpi accent-red">
          <div className="kpi-top"><div className="lbl">Bottlenecks</div><span className="delta flat">stable</span></div>
          <div className="val">1<span className="u"> of {steps.length}</span></div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
            <Icon name="alert" size={12} style={{ color: "var(--red)", verticalAlign: "middle" }}/>{" "}
            <b style={{ color: "var(--red)" }}>{bottleneck?.name || "—"}</b> holds critical path
          </div>
        </div>
        <div className="kpi accent-cyan">
          <div className="kpi-top"><div className="lbl">Throughput / hr</div><span className="delta up"><Icon name="arrow-up" size={10}/> 2.1%</span></div>
          <div className="val">{Math.floor(3600 / Math.max(1, taktTime))}<span className="u"> units</span></div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>Target <span className="mono">{Math.floor(3600 / Math.max(1, taktTime)) + 2} u/h</span> · Shift B</div>
        </div>
      </div>

      <div style={{ height: 12 }}/>

      {/* OEE cluster */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <h3>Overall Equipment Effectiveness (OEE)</h3>
          <span className="tag blue">LIVE</span>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
          <OEEDial label="Availability" value={oee.availability} color="#1E40AF"/>
          <OEEDial label="Performance" value={oee.performance} color="#06B6D4"/>
          <OEEDial label="Quality" value={oee.quality} color="#22C55E"/>
          <OEEDial label="OEE" value={oee.oee} color="#6D28D9" big/>
        </div>
      </div>

      <div className="section-row">
        <div className="card col-8">
          <div className="card-head">
            <div>
              <h3>Live Gantt Preview</h3>
              <div className="sub" style={{ marginTop: 2 }}>Critical path highlighted · Takt line at {taktTime}s</div>
            </div>
            <div className="legend">
              <span className="item"><span className="swatch" style={{ background: "var(--blue)" }}/>Machine</span>
              <span className="item"><span className="swatch" style={{ background: "var(--cyan)" }}/>Operator</span>
              <span className="item"><span className="swatch" style={{ background: "var(--violet)" }}/>Setup</span>
              <span className="item"><span className="swatch" style={{ background: "var(--red)" }}/>Bottleneck</span>
            </div>
          </div>
          <div className="card-body tight">
            <Gantt
              steps={schedule.steps}
              totalCT={totalCycleTime}
              takt={taktTime}
              tickEvery={40}
              onStepClick={(s) => { setSelectedId(s.id); setPage("builder"); }}
            />
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <h3>Bottleneck Summary</h3>
            <span className="tag red">CRITICAL</span>
          </div>
          <div className="card-body" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{bottleneck?.name || "—"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="step-meta"><div className="m machine"><div className="k">Machine</div><div className="v">{bottleneck?.machineTime || 0}s</div></div></div>
              <div className="step-meta"><div className="m op"><div className="k">Operator</div><div className="v">{bottleneck?.operatorTime || 0}s</div></div></div>
            </div>
            <div className="insight">
              <div className="ic"><Icon name="zap" size={15}/></div>
              <div className="txt">Reducing <b>{bottleneck?.name || "—"}</b> machine time by 10% improves total cycle by <b>~6%</b>.</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Suggested actions</div>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="ribbon" style={{ margin: 0, padding: "8px 10px" }}>
                <span className="tag violet">PARALLELIZE</span>
                <span style={{ fontSize: 11.5 }}>Split robotic fastening into 2 stations</span>
              </div>
              <div className="ribbon" style={{ margin: 0, padding: "8px 10px" }}>
                <span className="tag cyan">SMED</span>
                <span style={{ fontSize: 11.5 }}>Move setup 6→3s via tool pre-staging</span>
              </div>
            </div>
            <button className="btn accent sm" onClick={() => setPage("sim")}>Open in simulation</button>
          </div>
        </div>

        <div className="card col-7">
          <div className="card-head">
            <h3>Step Cycle Distribution</h3>
            <span className="sub">Machine + Operator + Setup</span>
          </div>
          <div className="card-body">
            <table className="tbl">
              <thead>
                <tr><th>#</th><th>Step</th><th style={{ textAlign: "right" }}>Machine</th><th style={{ textAlign: "right" }}>Op</th><th style={{ textAlign: "right" }}>Setup</th><th style={{ textAlign: "right" }}>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {schedule.steps.map((s, i) => (
                  <tr key={s.id} onClick={() => { setSelectedId(s.id); setPage("builder"); }} style={{ cursor: "pointer" }}>
                    <td className="num" style={{ color: "var(--ink-4)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td className="num" style={{ textAlign: "right", color: "var(--blue)" }}>{s.machineTime}s</td>
                    <td className="num" style={{ textAlign: "right", color: "#0A8CA3" }}>{s.operatorTime}s</td>
                    <td className="num" style={{ textAlign: "right", color: "var(--violet)" }}>{s.setupTime}s</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{s.cycleTime}s</td>
                    <td>{s.bottleneck ? <span className="tag red">BOTTLENECK</span> : s.critical ? <span className="tag blue">CRITICAL</span> : <span className="tag green">OPTIMAL</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card col-5">
          <div className="card-head">
            <h3>Recent Activity</h3>
            <span className="sub" style={{ cursor: "pointer" }} onClick={() => saveNewVersion()}>SAVE VERSION →</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              {activity.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "54px 1fr", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>{a.when === "now" ? "just now" : `${a.when} ago`}</span>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--ink)" }}>{a.act}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{a.who.toUpperCase()} · {String(a.tag).toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OEEDial({ label, value, color, big }) {
  const size = big ? 120 : 90;
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, value / 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F7" strokeWidth={10}/>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 400ms var(--ease)" }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize={big ? 22 : 16} fill="currentColor">{value}%</text>
      </svg>
      <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>
    </div>
  );
}
