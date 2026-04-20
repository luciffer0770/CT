import { useMemo } from "react";
import Icon from "../components/Icon.jsx";
import ChartZoomWrap from "../components/ChartZoomWrap.jsx";
import { Donut, HBar, Histogram } from "../components/Charts.jsx";
import Yamazumi from "../components/Yamazumi.jsx";
import Pareto from "../components/Pareto.jsx";
import PageCrumbs from "../components/PageCrumbs.jsx";
import { useStore } from "../store/useStore.js";
import {
  bottleneckContribution, taktGap, stepImpact,
  lineBalance, variationAnalysis, suggestOptimization, autoLineBalance,
  costPerUnit, wasteTally, stationOverloadVsTakt,
} from "../engine/analytics.js";

export default function Analytics({ schedule }) {
  const steps = useStore(s => s.steps);
  const taktTime = useStore(s => s.taktTime);
  const setPage = useStore(s => s.setPage);
  const setSelectedId = useStore(s => s.setSelectedId);
  const settings = useStore(s => s.settings);

  const contrib = useMemo(() => bottleneckContribution(schedule), [schedule]);
  const gap = useMemo(() => taktGap(schedule), [schedule]);
  const lb = useMemo(() => lineBalance(steps), [steps]);
  const variation = useMemo(() => variationAnalysis(steps), [steps]);
  const suggestions = useMemo(() => suggestOptimization(steps, taktTime), [steps, taktTime]);
  const autoBalance = useMemo(() => autoLineBalance(steps, Math.max(2, Object.keys(lb.load).length || 3)), [steps, lb]);
  const cost = useMemo(() => costPerUnit(steps, { laborRate: settings.laborRate, machineRate: settings.machineRate }), [steps, settings.laborRate, settings.machineRate]);
  const wastes = useMemo(() => wasteTally(steps), [steps]);
  const overload = useMemo(() => stationOverloadVsTakt(steps, taktTime), [steps, taktTime]);

  return (
    <>
      <PageCrumbs line={settings.line} pageTitle="ANALYTICS" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">Pareto, Yamazumi, bottleneck contribution, step-impact, line balance, variation &amp; cost.</div>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => setPage("sim")}><Icon name="play" size={13}/> Open Simulation</button>
        </div>
      </div>

      {suggestions[0] && (
        <div className="insight" style={{ marginBottom: 12 }}>
          <div className="ic"><Icon name="zap" size={15}/></div>
          <div className="txt">{suggestions[0].message}</div>
          <button className="btn accent sm" onClick={() => setPage("sim")}>Apply in simulation</button>
        </div>
      )}

      <div className="section-row">
        {/* Pareto */}
        <div className="card col-12">
          <div className="card-head"><h3>Pareto (80/20)</h3><span className="sub">VITAL FEW vs USEFUL MANY</span></div>
          <div className="card-body">
            <ChartZoomWrap title="Pareto chart">
              <Pareto steps={steps}/>
            </ChartZoomWrap>
          </div>
        </div>

        {/* Yamazumi */}
        <div className="card col-8">
          <div className="card-head"><h3>Yamazumi — Load per Station</h3><span className="sub">STACKED BY STEP · TAKT REFERENCE</span></div>
          <div className="card-body">
            <ChartZoomWrap title="Yamazumi chart">
              <Yamazumi steps={steps} takt={taktTime}/>
            </ChartZoomWrap>
          </div>
        </div>

        {/* VA/NVA + Takt gap */}
        <div className="card col-4">
          <div className="card-head"><h3>Value-added Ratio</h3><span className="sub">VA vs NVA</span></div>
          <div className="card-body">
            <div className="donut-wrap">
              <Donut parts={[
                { value: schedule.vaPct, color: "var(--green)" },
                { value: schedule.nvaPct, color: "var(--red)" },
              ]} centerValue={`${schedule.vaPct}%`}/>
              <div style={{ display: "grid", gap: 8 }}>
                <Row label="Value-added" value={`${schedule.sumVA}s`} dot="var(--green)"/>
                <Row label="Non VA (setup)" value={`${schedule.sumNVA}s`} dot="var(--red)"/>
                <Row label="Target VA" value="≥ 85%"/>
                <Row label="Takt gap" value={`${gap.gap}s`} color={gap.overTakt ? "var(--red)" : "var(--green)"}/>
                <Row label="Cost / unit" value={`$${cost.total.toFixed(2)}`} color="var(--blue)"/>
              </div>
            </div>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Bottleneck Contribution</h3><span className="sub">% OF TOTAL CYCLE (critical path)</span></div>
          <div className="card-body">
            {contrib.length === 0 ? <div className="muted">—</div> : contrib.map((c, i) => (
              <HBar key={c.id} label={`${i+1}. ${c.name}`} value={Math.round(c.pct)} max={100} color={i === 0 ? "var(--red)" : "var(--blue)"} suffix="%" cols="180px 1fr 60px"/>
            ))}
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Step Impact Analysis</h3><span className="sub">IF REDUCED BY 1s</span></div>
          <div className="card-body" style={{ maxHeight: 260, overflow: "auto" }}>
            {schedule.steps.map(s => {
              const impact = stepImpact(steps, taktTime, s.id, 1);
              return (
                <div key={s.id} className="hbar-row" style={{ gridTemplateColumns: "150px 1fr 80px" }}>
                  <div className="lbl" style={{ fontSize: 11.5 }}>{s.name}</div>
                  <div className="track"><div className="fill" style={{ width: `${Math.min(100, Math.abs(impact.savingsPct) * 20)}%`, background: impact.savingsSec > 0 ? "var(--green)" : "var(--ink-4)" }}/></div>
                  <div className="v" style={{ color: impact.savingsSec > 0 ? "var(--green)" : "var(--ink-4)" }}>−{impact.savingsSec.toFixed(1)}s</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Cycle-time Distribution</h3><span className="sub">SIMULATED · 30 UNITS</span></div>
          <div className="card-body">
            <ChartZoomWrap title="Histogram">
              <Histogram totalCT={schedule.totalCycleTime} takt={taktTime}/>
            </ChartZoomWrap>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Line Balancing</h3><span className="sub">LOAD PER STATION</span></div>
          <div className="card-body">
            {Object.entries(lb.load).length === 0 ? (
              <div className="muted" style={{ fontSize: 12 }}>No station assignments. Set <code>stationId</code> on steps.</div>
            ) : (
              Object.entries(lb.load).map(([st, load]) => (
                <HBar key={st} label={st} value={load} max={Math.max(lb.max, taktTime)} color={load > taktTime ? "var(--red)" : "var(--blue)"}/>
              ))
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <Stat k="Balance" v={`${lb.balanceScore}%`}/>
              <Stat k="Max" v={`${lb.max}s`}/>
              <Stat k="Min" v={`${lb.min}s`}/>
              <Stat k="Avg" v={`${Math.round(lb.avg)}s`}/>
            </div>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Station vs takt</h3><span className="sub">OVERLOAD HINT</span></div>
          <div className="card-body" style={{ fontSize: 12, color: "var(--ink-2)" }}>
            {overload.filter((o) => o.overloaded).length === 0 ? (
              <div className="muted">No station has total work time above takt ({taktTime}s). Assign stations for meaningful balance.</div>
            ) : (
              overload.filter((o) => o.overloaded).map((o) => (
                <div key={o.station} style={{ marginBottom: 8 }}>
                  <span className="tag red">{o.station}</span> {o.loadSec}s work vs {taktTime}s takt (+{o.overBy.toFixed(0)}s)
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Step Variation</h3><span className="sub">MIN / AVG / MAX · σ</span></div>
          <div className="card-body" style={{ maxHeight: 240, overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Step</th><th style={{ textAlign: "right" }}>Min</th><th style={{ textAlign: "right" }}>Avg</th><th style={{ textAlign: "right" }}>Max</th><th style={{ textAlign: "right" }}>σ</th></tr></thead>
              <tbody>
                {variation.map(v => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td className="num" style={{ textAlign: "right" }}>{v.min}s</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{v.mean}s</td>
                    <td className="num" style={{ textAlign: "right" }}>{v.max}s</td>
                    <td className="num" style={{ textAlign: "right", color: v.std > 3 ? "var(--red)" : "var(--ink-3)" }}>±{v.std}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Waste Tally (Lean)</h3><span className="sub">MUDA · MURA · MURI</span></div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <WasteTile label="Muda" value={wastes.muda} description="Non-value-adding waste" color="var(--red)"/>
            <WasteTile label="Mura" value={wastes.mura} description="Unevenness / variation" color="var(--amber)"/>
            <WasteTile label="Muri" value={wastes.muri} description="Overburden" color="var(--violet)"/>
          </div>
          {(wastes.muda + wastes.mura + wastes.muri) === 0 && (
            <div className="muted" style={{ padding: "0 14px 14px", fontSize: 12 }}>
              Tag steps with <span className="mono">Muda / Mura / Muri</span> in the Cycle Builder inspector to populate this.
            </div>
          )}
        </div>

        <div className="card col-12">
          <div className="card-head"><h3>Auto Line-Balance Suggestion</h3><span className="sub">REBALANCE</span></div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(" + autoBalance.length + ", 1fr)", gap: 12 }}>
            {autoBalance.map(st => (
              <div key={st.id} className="cmp-cell">
                <div className="mono muted" style={{ fontSize: 10 }}>{st.id}</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: st.total > taktTime ? "var(--red)" : "var(--ink)" }}>{st.total}s</div>
                <div style={{ fontSize: 10, color: "var(--ink-4)" }}>{st.steps.length} steps</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {st.steps.map(id => (
                    <span key={id} className="tag" onClick={() => { setSelectedId(id); setPage("builder"); }} style={{ cursor: "pointer" }}>{steps.find(s => s.id === id)?.name?.split(" ")[0] || id}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, dot, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {dot && <span className="swatch" style={{ width: 10, height: 10, background: dot, borderRadius: 2, display: "inline-block" }}/>}
        {label}
      </span>
      <span className="mono" style={{ fontWeight: 600, color: color || "var(--ink)" }}>{value}</span>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div>
      <div className="mono muted" style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" }}>{k}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div>
    </div>
  );
}

function WasteTile({ label, value, description, color }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "10px 12px", background: "var(--surface)" }}>
      <div className="mono muted" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, marginTop: 2, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{description}</div>
    </div>
  );
}
