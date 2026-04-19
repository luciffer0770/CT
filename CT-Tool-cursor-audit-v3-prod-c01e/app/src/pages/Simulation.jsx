import { useState, useMemo } from "react";
import Icon from "../components/Icon.jsx";
import Gantt from "../components/Gantt.jsx";
import PageCrumbs from "../components/PageCrumbs.jsx";
import { useStore } from "../store/useStore.js";
import { computeSchedule } from "../engine/calc.js";
import { autoLineBalance } from "../engine/analytics.js";

export default function Simulation({ schedule }) {
  const steps = useStore(s => s.steps);
  const baselineSteps = useStore(s => s.baselineSteps);
  const setBaseline = useStore(s => s.setBaseline);
  const taktTime = useStore(s => s.taktTime);
  const setSteps = useStore(s => s.setSteps);
  const toast = useStore(s => s.toast);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const settings = useStore(s => s.settings);
  const askConfirm = useStore(s => s.askConfirm);

  // Per-step adjustments: { [id]: { m, o, s } }
  const [adj, setAdj] = useState({});
  const [removedIds, setRemovedIds] = useState(new Set());

  const baselineSchedule = useMemo(() => computeSchedule(baselineSteps, taktTime), [baselineSteps, taktTime]);

  const simSteps = useMemo(() => {
    return steps
      .filter(s => !removedIds.has(s.id))
      .map(s => {
        const a = adj[s.id] || { m: 0, o: 0, s: 0 };
        return {
          ...s,
          machineTime: Math.max(0, (s.machineTime || 0) + a.m),
          operatorTime: Math.max(0, (s.operatorTime || 0) + a.o),
          setupTime: Math.max(0, (s.setupTime || 0) + a.s),
          dependencies: (s.dependencies || []).filter(d => !removedIds.has(d)),
        };
      });
  }, [steps, adj, removedIds]);

  const simState = useMemo(() => computeSchedule(simSteps, taktTime), [simSteps, taktTime]);

  const ctDelta = simState.totalCycleTime - baselineSchedule.totalCycleTime;
  const effDelta = simState.efficiency - baselineSchedule.efficiency;

  const apply = () => {
    askConfirm({
      title: "Apply simulation to line?",
      body: "Replace the live process with the simulated times and removals. You can undo afterward (⌘Z).",
      confirmLabel: "Apply",
      onConfirm: () => {
        setSteps(simSteps);
        setAdj({});
        setRemovedIds(new Set());
        toast("Simulation applied to line", "success");
      },
    });
  };
  const reset = () => {
    askConfirm({
      title: "Reset simulation?",
      body: "Discard all sliders and removed-step toggles in this view?",
      confirmLabel: "Reset",
      onConfirm: () => { setAdj({}); setRemovedIds(new Set()); },
    });
  };

  const setAsBaseline = () => {
    askConfirm({
      title: "Update baseline?",
      body: "Save the current live line as the new baseline used for “reset to baseline”.",
      confirmLabel: "Set baseline",
      onConfirm: () => {
        setBaseline(steps);
        toast("Baseline updated to current line", "success");
      },
    });
  };

  const monteCarlo = () => {
    // Run 1000 trials with variability noise
    const runs = [];
    for (let i = 0; i < 1000; i++) {
      const noisy = simSteps.map(s => {
        const v = (s.variability || 0) / 100;
        const factor = 1 + ((Math.random() - 0.5) * 2 * v);
        return {
          ...s,
          machineTime: Math.max(0, (s.machineTime || 0) * factor),
          operatorTime: Math.max(0, (s.operatorTime || 0) * factor),
        };
      });
      const sc = computeSchedule(noisy, taktTime);
      runs.push(sc.totalCycleTime);
    }
    runs.sort((a, b) => a - b);
    const min = runs[0];
    const max = runs[runs.length - 1];
    const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
    const p95 = runs[Math.floor(runs.length * 0.95)];
    toast(`1,000 trials: avg ${avg.toFixed(1)}s · p95 ${p95.toFixed(1)}s · range [${min.toFixed(0)}, ${max.toFixed(0)}]`, "success");
  };

  const autoBalance = () => {
    askConfirm({
      title: "Auto line-balance?",
      body: "Reassign station IDs on the live line from the current simulation state (3 stations).",
      confirmLabel: "Balance",
      onConfirm: () => {
        const stations = autoLineBalance(simSteps, 3);
        const newSteps = simSteps.map(s => {
          const station = stations.find(st => st.steps.includes(s.id));
          return { ...s, stationId: station?.id || s.stationId };
        });
        setSteps(newSteps);
        toast("Auto line-balancing applied", "success");
      },
    });
  };

  const removeStepSim = (id) => {
    const next = new Set(removedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRemovedIds(next);
  };

  return (
    <>
      <PageCrumbs line={settings.line} pageTitle="SIMULATION" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Simulation</h1>
          <div className="page-sub">What-if analysis. Adjust machine/operator/setup time per step and see impact on takt, efficiency, bottleneck.</div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={reset}><Icon name="reset" size={13}/> Reset</button>
          <button className="btn" onClick={monteCarlo}><Icon name="play" size={13}/> Run 1,000 trials</button>
          <button className="btn" onClick={autoBalance}><Icon name="shuffle" size={13}/> Auto balance</button>
          <button className="btn" onClick={setAsBaseline}><Icon name="save" size={13}/> Set baseline</button>
          <button className="btn accent" onClick={apply}><Icon name="check" size={13}/> Apply to line</button>
          <button
            className="btn primary"
            onClick={() => {
              askConfirm({
                title: "Apply and save version?",
                body: "Apply the simulation to the live line and save a new named version?",
                confirmLabel: "Apply and save",
                onConfirm: () => {
                  setSteps(simSteps);
                  setAdj({});
                  setRemovedIds(new Set());
                  saveNewVersion("After simulation");
                  toast("Applied and saved version", "success");
                },
              });
            }}
          ><Icon name="save" size={13}/> Apply + Save</button>
        </div>
      </div>

      <div className="cmp-grid" style={{ marginBottom: 12 }}>
        <div className="cmp-cell">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: ".1em" }}>BEFORE · BASELINE</div>
            <div className="tag">CURRENT</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 8 }}>
            <Metric k="Cycle" v={baselineSchedule.totalCycleTime} u="s" color="var(--ink)"/>
            <Metric k="Efficiency" v={baselineSchedule.efficiency} u="%" color="var(--ink)"/>
            <Metric k="Bottleneck" v={baselineSchedule.bottleneck?.name?.split(" ")[0] || "—"} u="" color="var(--red)" small/>
          </div>
          <div style={{ marginTop: 12 }}>
            <Gantt steps={baselineSchedule.steps} totalCT={baselineSchedule.totalCycleTime} takt={baselineSchedule.takt} tickEvery={40} labelWidth={130}/>
          </div>
        </div>
        <div className="cmp-cell after">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="mono" style={{ color: "var(--green)", fontSize: 10, letterSpacing: ".1em" }}>AFTER · SIMULATION</div>
            <div className="tag green">PROJECTED</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 8 }}>
            <Metric k="Cycle" v={simState.totalCycleTime} u="s" delta={ctDelta} color={ctDelta <= 0 ? "var(--green)" : "var(--red)"} invertDelta/>
            <Metric k="Efficiency" v={simState.efficiency} u="%" delta={effDelta} color={effDelta >= 0 ? "var(--green)" : "var(--red)"}/>
            <Metric k="Bottleneck" v={simState.bottleneck?.name?.split(" ")[0] || "—"} u="" color="var(--red)" small/>
          </div>
          <div style={{ marginTop: 12 }}>
            <Gantt steps={simState.steps} totalCT={simState.totalCycleTime} takt={simState.takt} tickEvery={40} labelWidth={130}/>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Adjust Step Times</h3>
          <span className="sub">Δ MACHINE / OPERATOR / SETUP · REMOVE</span>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {steps.map(s => {
            const a = adj[s.id] || { m: 0, o: 0, s: 0 };
            const removed = removedIds.has(s.id);
            return (
              <div key={s.id} style={{ borderBottom: "1px dashed var(--border)", paddingBottom: 8, opacity: removed ? 0.55 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {schedule.steps.find(x => x.id === s.id)?.bottleneck && <span className="tag red">B/N</span>}
                    <button className={`btn xs ${removed ? "danger" : ""}`} onClick={() => removeStepSim(s.id)}>{removed ? "Restore" : "Remove"}</button>
                  </div>
                </div>
                <div className="slider-row" style={{ padding: "4px 0", borderBottom: 0 }}>
                  <div className="k">Machine <small>{s.machineTime}s base</small></div>
                  <input type="range" min={-30} max={30} value={a.m} onChange={(e) => setAdj({ ...adj, [s.id]: { ...a, m: Number(e.target.value) } })} style={{ accentColor: "var(--blue)" }}/>
                  <div className="v" style={{ color: a.m < 0 ? "var(--green)" : a.m > 0 ? "var(--red)" : "var(--ink)" }}>{a.m >= 0 ? "+" : ""}{a.m}s</div>
                </div>
                <div className="slider-row" style={{ padding: "4px 0", borderBottom: 0 }}>
                  <div className="k">Operator <small>{s.operatorTime}s base</small></div>
                  <input type="range" min={-20} max={20} value={a.o} onChange={(e) => setAdj({ ...adj, [s.id]: { ...a, o: Number(e.target.value) } })} style={{ accentColor: "var(--cyan)" }}/>
                  <div className="v" style={{ color: a.o < 0 ? "var(--green)" : a.o > 0 ? "var(--red)" : "var(--ink)" }}>{a.o >= 0 ? "+" : ""}{a.o}s</div>
                </div>
                <div className="slider-row" style={{ padding: "4px 0", borderBottom: 0 }}>
                  <div className="k">Setup <small>{s.setupTime}s base</small></div>
                  <input type="range" min={-20} max={20} value={a.s} onChange={(e) => setAdj({ ...adj, [s.id]: { ...a, s: Number(e.target.value) } })} style={{ accentColor: "var(--violet)" }}/>
                  <div className="v" style={{ color: a.s < 0 ? "var(--green)" : a.s > 0 ? "var(--red)" : "var(--ink)" }}>{a.s >= 0 ? "+" : ""}{a.s}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Metric({ k, v, u, delta, color, small, invertDelta }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>{k}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: small ? 14 : 20, fontWeight: 600, color, marginTop: 2 }}>
        {v}<span style={{ fontSize: small ? 10 : 12, color: "var(--ink-4)", fontWeight: 500 }}>{u}</span>
      </div>
      {typeof delta === "number" && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 2, color: (invertDelta ? delta <= 0 : delta >= 0) ? "var(--green)" : "var(--red)" }}>
          {delta >= 0 ? "+" : ""}{delta}{u}
        </div>
      )}
    </div>
  );
}
