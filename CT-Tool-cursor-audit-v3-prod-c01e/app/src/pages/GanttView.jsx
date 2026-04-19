import { Fragment, useState, useRef, useCallback } from "react";
import Icon from "../components/Icon.jsx";
import Gantt from "../components/Gantt.jsx";
import Swimlane from "../components/Swimlane.jsx";
import ProcessFlow from "../components/ProcessFlow.jsx";
import { HBar } from "../components/Charts.jsx";
import PageCrumbs from "../components/PageCrumbs.jsx";
import { useStore } from "../store/useStore.js";
import { exportGanttSVG, exportGanttPNG } from "../engine/pdf-lazy.js";

export default function GanttView({ schedule }) {
  const settings = useStore(s => s.settings);
  const taktTime = useStore(s => s.taktTime);
  const heatmap = useStore(s => s.heatmap);
  const setHeatmap = useStore(s => s.setHeatmap);
  const showDeps = useStore(s => s.showDeps);
  const setShowDeps = useStore(s => s.setShowDeps);
  const highlightCriticalPath = useStore(s => s.highlightCriticalPath);
  const setHighlightCriticalPath = useStore(s => s.setHighlightCriticalPath);
  const setPage = useStore(s => s.setPage);
  const setSelectedId = useStore(s => s.setSelectedId);
  const [tickEvery, setTickEvery] = useState(20);
  const [mode, setMode] = useState("gantt"); // gantt | swimlane | flow
  const [dagZoom, setDagZoom] = useState(1);
  const dagScrollRef = useRef(null);
  const dagDrag = useRef({ active: false, sx: 0, sy: 0, sl: 0, st: 0 });

  const onDagWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = dagScrollRef.current;
    if (!el) return;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setDagZoom((z) => Math.min(2.5, Math.max(0.35, Math.round((z + delta) * 100) / 100)));
  }, []);

  const onDagPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = dagScrollRef.current;
    if (!el) return;
    dagDrag.current = { active: true, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.style.cursor = "grabbing";
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);
  const onDagPointerMove = useCallback((e) => {
    const d = dagDrag.current;
    if (!d.active) return;
    const el = dagScrollRef.current;
    if (!el) return;
    el.scrollLeft = d.sl - (e.clientX - d.sx);
    el.scrollTop = d.st - (e.clientY - d.sy);
  }, []);
  const endDagDrag = useCallback((e) => {
    dagDrag.current.active = false;
    const el = dagScrollRef.current;
    if (el) {
      el.style.cursor = "grab";
      try {
        if (e?.pointerId != null) el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const overTakt = schedule.totalCycleTime > taktTime;

  const jumpToBuilder = (s) => { setSelectedId(s.id); setPage("builder"); };

  return (
    <>
      <PageCrumbs line={settings.line} pageTitle="SCHEDULE" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Schedule</h1>
          <div className="page-sub">Gantt, swimlane (per-station) and DAG (process-flow) views.</div>
        </div>
        <div className="toolbar">
          <div className="seg-btn">
            <button className={mode === "gantt" ? "active" : ""} onClick={() => setMode("gantt")}>Gantt</button>
            <button className={mode === "swimlane" ? "active" : ""} onClick={() => setMode("swimlane")}>Swimlane</button>
            <button className={mode === "flow" ? "active" : ""} onClick={() => setMode("flow")}>DAG</button>
          </div>
          <button className={`btn ${showDeps ? "accent" : ""}`} onClick={() => setShowDeps(!showDeps)}><Icon name="link" size={13}/> Deps</button>
          <button className={`btn ${heatmap ? "accent" : ""}`} onClick={() => setHeatmap(!heatmap)}><Icon name="flame" size={13}/> Heatmap</button>
          <button className={`btn ${highlightCriticalPath ? "accent" : ""}`} onClick={() => setHighlightCriticalPath(!highlightCriticalPath)} title="Highlight critical-path rows in the Gantt">
            <Icon name="zap" size={13}/> Critical path
          </button>
          <button className="btn" onClick={() => setTickEvery(Math.max(5, tickEvery - 5))}><Icon name="minus" size={13}/></button>
          <span className="chip mono">{tickEvery}s/tick</span>
          <button className="btn" onClick={() => setTickEvery(Math.min(60, tickEvery + 5))}><Icon name="plus" size={13}/></button>
          <button className="btn" onClick={() => exportGanttSVG(schedule)}><Icon name="download" size={13}/> SVG</button>
          <button className="btn primary" onClick={() => exportGanttPNG(schedule)}><Icon name="download" size={13}/> PNG</button>
        </div>
      </div>

      <div className="ribbon">
        <span className="chip"><b>CT</b> {schedule.totalCycleTime}s</span>
        <span className="chip"><b>Takt</b> {taktTime}s</span>
        <span className="chip" style={{ background: overTakt ? "var(--red-50)" : "var(--green-50)", borderColor: overTakt ? "rgba(225,29,46,.25)" : "rgba(34,197,94,.25)" }}>
          <b style={{ color: overTakt ? "var(--red)" : "var(--green)" }}>
            {overTakt ? `OVER TAKT +${schedule.totalCycleTime - taktTime}s` : `WITHIN TAKT −${taktTime - schedule.totalCycleTime}s`}
          </b>
        </span>
        <span className="chip"><b>VA</b> {schedule.vaPct}%</span>
        <span className="chip"><b>Wait</b> {schedule.totalWait}s</span>
        <div className="legend" style={{ marginLeft: "auto" }}>
          <span className="item"><span className="swatch" style={{ background: "var(--blue)" }}/>Machine</span>
          <span className="item"><span className="swatch" style={{ background: "var(--cyan)" }}/>Operator</span>
          <span className="item"><span className="swatch" style={{ background: "var(--violet)" }}/>Setup</span>
          <span className="item"><span className="swatch" style={{ background: "repeating-linear-gradient(45deg, #FCA5A5 0 4px, #F87171 4px 8px)" }}/>Wait</span>
          <span className="item"><span className="swatch" style={{ background: "var(--red)" }}/>Bottleneck</span>
        </div>
      </div>

      {mode === "gantt" && (
        <div className="card grid-bg">
          <div className="card-head">
            <h3>Schedule · {schedule.steps.length} steps</h3>
            <span className="sub">0 → {schedule.totalCycleTime}s</span>
          </div>
          <div className="card-body tight" style={{ minHeight: 500 }}>
            <Gantt steps={schedule.steps} totalCT={schedule.totalCycleTime} takt={taktTime} tickEvery={tickEvery} labelWidth={180} showDeps={showDeps} heatmap={heatmap} highlightCritical={highlightCriticalPath} onStepClick={jumpToBuilder}/>
          </div>
        </div>
      )}

      {mode === "swimlane" && (
        <div className="card">
          <div className="card-head">
            <h3>Swimlane · grouped by Station</h3>
            <span className="sub">SET stationId ON STEPS</span>
          </div>
          <div className="card-body tight" style={{ minHeight: 500 }}>
            <Swimlane schedule={schedule} takt={taktTime} onStepClick={jumpToBuilder}/>
          </div>
        </div>
      )}

      {mode === "flow" && (
        <div className="card">
          <div className="card-head">
            <h3>Process Flow · DAG</h3>
            <span className="sub">LAYERED BY DEPENDENCY DEPTH</span>
          </div>
          <div className="card-body tight" style={{ padding: 0 }}>
            <div className="dag-zoom-wrap">
              <div className="dag-zoom-toolbar">
                <span className="mono">Zoom {(dagZoom * 100).toFixed(0)}%</span>
                <input
                  type="range"
                  min={35}
                  max={250}
                  step={5}
                  value={Math.round(dagZoom * 100)}
                  onChange={(e) => setDagZoom(Number(e.target.value) / 100)}
                  aria-label="DAG zoom"
                />
                <button type="button" className="btn xs" onClick={() => setDagZoom(1)}>Reset</button>
                <span className="mono muted" style={{ marginLeft: "auto" }}>Ctrl+wheel · drag pan</span>
              </div>
              <div
                className="dag-zoom-scroll"
                ref={dagScrollRef}
                onWheel={onDagWheel}
                onPointerDown={onDagPointerDown}
                onPointerMove={onDagPointerMove}
                onPointerUp={endDagDrag}
                onPointerCancel={endDagDrag}
                role="application"
                aria-label="DAG zoom and pan"
              >
                <div style={{ display: "inline-block", padding: 12 }}>
                  <ProcessFlow schedule={schedule} onStepClick={jumpToBuilder} height={500} zoom={dagZoom}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 12 }}/>
      <div className="section-row">
        <div className="card col-6">
          <div className="card-head"><h3>Critical Path</h3><span className="sub">LONGEST CHAIN</span></div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {schedule.steps.filter(s => s.critical).map((s, i, arr) => (
                <Fragment key={s.id}>
                  <span className={`tag ${s.bottleneck ? "red" : "blue"}`} style={{ padding: "4px 8px", fontSize: 11 }}>{s.name}</span>
                  {i < arr.length - 1 && <Icon name="chev-right" size={12} style={{ color: "var(--ink-4)" }}/>}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="card col-6">
          <div className="card-head"><h3>Parallel Groups</h3><span className="sub">SAVINGS</span></div>
          <div className="card-body" style={{ fontSize: 12, color: "var(--ink-2)" }}>
            {(() => {
              const groups = {};
              schedule.steps.forEach(s => { if (s.groupId) { groups[s.groupId] = groups[s.groupId] || []; groups[s.groupId].push(s); } });
              const entries = Object.entries(groups);
              if (!entries.length) return <div className="muted">No parallel groups — shift-select in Builder to create one.</div>;
              return entries.map(([gid, members]) => {
                const maxCt = Math.max(...members.map(m => m.cycleTime));
                const sumCt = members.reduce((a, b) => a + b.cycleTime, 0);
                const savings = sumCt - maxCt;
                return <HBar key={gid} label={`${members.map(m => m.name.split(" ")[0]).join(" ‖ ")} (${gid.slice(0, 6)})`} value={savings} max={Math.max(30, sumCt)} color="var(--green)"/>;
              });
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
