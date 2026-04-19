import React, { useMemo, useState } from "react";
import Icon from "../components/Icon.jsx";
import { useStore } from "../store/useStore.js";
import { takt as taktCalc, costPerUnit, kanbanBins, paretoSteps } from "../engine/analytics.js";

export default function Tools({ schedule }) {
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const setTakt = useStore(s => s.setTakt);
  const steps = useStore(s => s.steps);
  const updateStep = useStore(s => s.updateStep);
  const applySMED = useStore(s => s.applySMED);
  const toast = useStore(s => s.toast);

  /* Takt calculator */
  const [avail, setAvail] = useState(settings.availableTimeMin || 420);
  const [demand, setDemand] = useState(settings.demandPerShift || 100);
  const calcTakt = useMemo(() => taktCalc(avail, demand), [avail, demand]);

  /* Cost */
  const cost = useMemo(() => costPerUnit(steps, { laborRate: settings.laborRate, machineRate: settings.machineRate }), [steps, settings.laborRate, settings.machineRate]);
  const totalCost = (cost.total).toFixed(2);

  /* Kanban */
  const [kanban, setKanban] = useState({ demandPerMin: 2, leadTimeMin: 45, containerSize: 10, safetyPct: settings.kanbanSafetyPct || 20 });
  const kb = useMemo(() => kanbanBins(kanban), [kanban]);

  /* SMED Wizard */
  const [smedStep, setSmedStep] = useState(steps.find(s => (s.setupTime || 0) > 0)?.id || steps[0]?.id);
  const curStep = steps.find(s => s.id === smedStep);
  const [internal, setInternal] = useState(curStep ? Math.round((curStep.setupTime || 0) * 0.4) : 0);
  const [external, setExternal] = useState(curStep ? Math.round((curStep.setupTime || 0) * 0.6) : 0);

  React.useEffect(() => {
    if (curStep) {
      setInternal(Math.round((curStep.setupInternal ?? curStep.setupTime * 0.4)));
      setExternal(Math.round((curStep.setupExternal ?? curStep.setupTime * 0.6)));
    }
  }, [smedStep]); // eslint-disable-line

  const savings = curStep ? (curStep.setupTime || 0) - internal : 0;

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> {settings.line} <span className="sep">/</span> TOOLS</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Industrial Tools</h1>
          <div className="page-sub">Takt calculator, cost per unit, Kanban sizing and SMED setup splitter.</div>
        </div>
      </div>

      <div className="section-row">
        {/* Takt Calculator */}
        <div className="card col-6">
          <div className="card-head"><h3>Takt Time Calculator</h3><span className="sub">AVAILABLE ÷ DEMAND</span></div>
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            <div className="slider-row">
              <div className="k">Available time<small>minutes / shift</small></div>
              <input className="input num" type="number" value={avail} onChange={(e) => setAvail(Number(e.target.value) || 0)}/>
              <div className="v">{avail} min</div>
            </div>
            <div className="slider-row">
              <div className="k">Demand<small>units / shift</small></div>
              <input className="input num" type="number" value={demand} onChange={(e) => setDemand(Number(e.target.value) || 0)}/>
              <div className="v">{demand} u</div>
            </div>
            <div className="insight">
              <div className="ic"><Icon name="clock" size={15}/></div>
              <div className="txt">Takt time = <b>{calcTakt}s</b> per unit · throughput target <b>{demand}</b> u / shift.</div>
              <button className="btn accent sm" onClick={() => { setTakt(calcTakt); setSettings({ availableTimeMin: avail, demandPerShift: demand }); toast(`Takt set to ${calcTakt}s`, "success"); }}>Apply as Takt</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              <Tile k="Current CT" v={`${schedule.totalCycleTime}s`}/>
              <Tile k="Current takt" v={`${schedule.takt}s`}/>
              <Tile k="Gap" v={`${schedule.takt - schedule.totalCycleTime}s`} color={schedule.totalCycleTime > schedule.takt ? "var(--red)" : "var(--green)"}/>
            </div>
          </div>
        </div>

        {/* Cost per unit */}
        <div className="card col-6">
          <div className="card-head"><h3>Cost per Unit</h3><span className="sub">LABOR + MACHINE</span></div>
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            <div className="slider-row">
              <div className="k">Labor rate<small>$/hr</small></div>
              <input className="input num" type="number" value={settings.laborRate} onChange={(e) => setSettings({ laborRate: Number(e.target.value) || 0 })}/>
              <div className="v">${settings.laborRate}</div>
            </div>
            <div className="slider-row">
              <div className="k">Machine rate<small>$/hr (depreciation + energy)</small></div>
              <input className="input num" type="number" value={settings.machineRate} onChange={(e) => setSettings({ machineRate: Number(e.target.value) || 0 })}/>
              <div className="v">${settings.machineRate}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Tile k="Labor / unit" v={`$${cost.labor.toFixed(3)}`}/>
              <Tile k="Machine / unit" v={`$${cost.machine.toFixed(3)}`}/>
              <Tile k="Total / unit" v={`$${totalCost}`} color="var(--blue)"/>
            </div>
            <div className="insight" style={{ borderColor: "rgba(109,40,217,.3)", background: "linear-gradient(90deg, var(--violet-50), var(--surface))" }}>
              <div className="ic" style={{ background: "var(--violet)" }}><Icon name="cpu" size={15}/></div>
              <div className="txt">At {schedule.takt}s takt → <b>{Math.floor(3600 / Math.max(1, schedule.takt))}</b> u/h · hourly cost <b>${(Number(totalCost) * Math.floor(3600 / Math.max(1, schedule.takt))).toFixed(2)}</b>.</div>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="card col-6">
          <div className="card-head"><h3>Kanban Bin Calculator</h3><span className="sub">REORDER SIZING</span></div>
          <div className="card-body" style={{ display: "grid", gap: 10 }}>
            <div className="slider-row">
              <div className="k">Demand<small>units / min</small></div>
              <input className="input num" type="number" step="0.5" value={kanban.demandPerMin} onChange={(e) => setKanban({ ...kanban, demandPerMin: Number(e.target.value) || 0 })}/>
              <div className="v">{kanban.demandPerMin}</div>
            </div>
            <div className="slider-row">
              <div className="k">Lead time<small>minutes</small></div>
              <input className="input num" type="number" value={kanban.leadTimeMin} onChange={(e) => setKanban({ ...kanban, leadTimeMin: Number(e.target.value) || 0 })}/>
              <div className="v">{kanban.leadTimeMin}m</div>
            </div>
            <div className="slider-row">
              <div className="k">Container size<small>units / bin</small></div>
              <input className="input num" type="number" value={kanban.containerSize} onChange={(e) => setKanban({ ...kanban, containerSize: Number(e.target.value) || 1 })}/>
              <div className="v">{kanban.containerSize}</div>
            </div>
            <div className="slider-row">
              <div className="k">Safety %<small>for variability</small></div>
              <input type="range" min={0} max={100} value={kanban.safetyPct} onChange={(e) => setKanban({ ...kanban, safetyPct: Number(e.target.value) })}/>
              <div className="v">{kanban.safetyPct}%</div>
            </div>
            <div className="insight">
              <div className="ic"><Icon name="layers" size={15}/></div>
              <div className="txt">Required bins: <b>{kb.bins}</b> · total inventory ≈ <b>{kb.bins * kb.containerSize}</b> units.</div>
            </div>
          </div>
        </div>

        {/* SMED */}
        <div className="card col-6">
          <div className="card-head"><h3>SMED Setup Splitter</h3><span className="sub">INTERNAL ⇄ EXTERNAL</span></div>
          <div className="card-body" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <select className="input" value={smedStep || ""} onChange={(e) => setSmedStep(e.target.value)} style={{ width: "100%" }}>
                {steps.map(s => <option key={s.id} value={s.id}>{s.name} — {s.setupTime}s</option>)}
              </select>
              <span className="tag">{curStep?.setupTime || 0}s total</span>
            </div>
            {curStep && (
              <>
                <div className="slider-row">
                  <div className="k">Internal<small>must stop the machine</small></div>
                  <input type="range" min={0} max={(curStep.setupTime || 0) + 20} value={internal} onChange={(e) => setInternal(Number(e.target.value))} style={{ accentColor: "var(--red)" }}/>
                  <div className="v" style={{ color: "var(--red)" }}>{internal}s</div>
                </div>
                <div className="slider-row">
                  <div className="k">External<small>prepared while machine runs</small></div>
                  <input type="range" min={0} max={(curStep.setupTime || 0) + 20} value={external} onChange={(e) => setExternal(Number(e.target.value))} style={{ accentColor: "var(--green)" }}/>
                  <div className="v" style={{ color: "var(--green)" }}>{external}s</div>
                </div>
                <div className="insight">
                  <div className="ic"><Icon name="zap" size={15}/></div>
                  <div className="txt">
                    If external setup is performed during the previous step, in-line setup drops to <b>{internal}s</b> — saving <b>{savings}s</b> per cycle.
                  </div>
                  <button className="btn accent sm" onClick={() => applySMED(curStep.id, internal, external)}>Apply</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 80/20 quick ref */}
        <div className="card col-12">
          <div className="card-head"><h3>80/20 (Pareto) Summary</h3><span className="sub">TOP CONTRIBUTORS</span></div>
          <div className="card-body">
            <table className="tbl">
              <thead><tr><th>#</th><th>Step</th><th className="num" style={{ textAlign: "right" }}>Cycle</th><th className="num" style={{ textAlign: "right" }}>Cumulative %</th><th>Zone</th></tr></thead>
              <tbody>
                {paretoSteps(steps).map((d, i) => (
                  <tr key={d.id}>
                    <td className="num muted">#{i + 1}</td>
                    <td>{d.name}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{d.value}s</td>
                    <td className="num" style={{ textAlign: "right" }}>{d.cumPct.toFixed(1)}%</td>
                    <td>{d.cumPct <= 80 ? <span className="tag red">VITAL FEW (80%)</span> : <span className="tag green">USEFUL MANY</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Tile({ k, v, color }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "10px 12px" }}>
      <div className="mono muted" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>{k}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: color || "var(--ink)" }}>{v}</div>
    </div>
  );
}
