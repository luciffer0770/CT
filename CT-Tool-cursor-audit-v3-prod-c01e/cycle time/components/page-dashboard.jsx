/* Dashboard page */
function PageDashboard({ state }) {
  const { steps, totalCT, takt, efficiency, bottleneck, vaPct, nvaPct } = state;
  const trend = [210, 218, 224, 232, 228, 241, 236, 245, totalCT];
  const effTrend = [91, 93, 89, 92, 94, 90, 93, 95, efficiency % 100];

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> DASHBOARD</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Production Dashboard</h1>
          <div className="page-sub">Real-time overview of cycle time, efficiency and critical path for Line 07.</div>
        </div>
        <div className="toolbar">
          <button className="btn"><Icon name="filter" size={13}/> Filters</button>
          <button className="btn"><Icon name="reset" size={13}/> Reset</button>
          <button className="btn primary"><Icon name="download" size={13}/> Export snapshot</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi accent-blue">
          <div className="kpi-top"><div className="lbl">Total Cycle Time</div><span className="delta down"><Icon name="arrow-down" size={10}/> 3.2%</span></div>
          <div className="val">{totalCT}<span className="u">s</span></div>
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
            <Icon name="alert" size={12} style={{color:"var(--red)", verticalAlign:"middle"}}/> <b style={{color:"var(--red)"}}>{bottleneck?.name}</b> holds critical path
          </div>
        </div>
        <div className="kpi accent-cyan">
          <div className="kpi-top"><div className="lbl">Throughput / hr</div><span className="delta up"><Icon name="arrow-up" size={10}/> 2.1%</span></div>
          <div className="val">{Math.floor(3600/takt)}<span className="u"> units</span></div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>Target <span style={{fontFamily:"var(--font-mono)", color:"var(--ink)"}}>{Math.floor(3600/takt)+2} u/h</span> · Shift B</div>
        </div>
      </div>

      <div style={{ height: 12 }}/>

      <div className="section-row">
        <div className="card col-8">
          <div className="card-head">
            <div>
              <h3>Live Gantt Preview</h3>
              <div className="sub" style={{ marginTop: 2 }}>Critical path highlighted · Takt line at {takt}s</div>
            </div>
            <div className="legend">
              <span className="item"><span className="swatch" style={{background:"var(--blue)"}}/>Machine</span>
              <span className="item"><span className="swatch" style={{background:"var(--cyan)"}}/>Operator</span>
              <span className="item"><span className="swatch" style={{background:"var(--violet)"}}/>Setup</span>
              <span className="item"><span className="swatch" style={{background:"var(--red)"}}/>Bottleneck</span>
            </div>
          </div>
          <div className="card-body tight">
            <Gantt steps={steps} totalCT={totalCT} takt={takt} tickEvery={40}/>
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <h3>Bottleneck Summary</h3>
            <span className="tag red">CRITICAL</span>
          </div>
          <div className="card-body" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{bottleneck?.name}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8 }}>
              <div className="step-meta"><div className="m machine"><div className="k">Machine</div><div className="v">{bottleneck?.machine}s</div></div></div>
              <div className="step-meta"><div className="m op"><div className="k">Operator</div><div className="v">{bottleneck?.op}s</div></div></div>
            </div>
            <div className="insight">
              <div className="ic"><Icon name="zap" size={15}/></div>
              <div className="txt">Reducing <b>{bottleneck?.name}</b> machine time by 10% improves total cycle by <b>~6%</b>.</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Suggested actions</div>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="ribbon" style={{ margin: 0, padding: "8px 10px" }}>
                <span className="tag violet">PARALLELIZE</span>
                <span style={{fontSize:11.5}}>Split robotic fastening into 2 stations</span>
              </div>
              <div className="ribbon" style={{ margin: 0, padding: "8px 10px" }}>
                <span className="tag cyan">SMED</span>
                <span style={{fontSize:11.5}}>Move setup 6→3s via tool pre-staging</span>
              </div>
            </div>
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
                <tr><th>#</th><th>Step</th><th style={{textAlign:"right"}}>Machine</th><th style={{textAlign:"right"}}>Op</th><th style={{textAlign:"right"}}>Setup</th><th style={{textAlign:"right"}}>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={s.id}>
                    <td className="num" style={{color:"var(--ink-4)"}}>{String(i+1).padStart(2,"0")}</td>
                    <td style={{fontWeight:500}}>{s.name}</td>
                    <td className="num" style={{textAlign:"right", color:"var(--blue)"}}>{s.machine}s</td>
                    <td className="num" style={{textAlign:"right", color:"#0A8CA3"}}>{s.op}s</td>
                    <td className="num" style={{textAlign:"right", color:"var(--violet)"}}>{s.setup}s</td>
                    <td className="num" style={{textAlign:"right", fontWeight:600}}>{s.duration}s</td>
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
            <span className="sub">v14 — AUTOSAVE</span>
          </div>
          <div className="card-body" style={{padding: 0}}>
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display:"grid", gridTemplateColumns:"54px 1fr", gap: 10 }}>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-4)"}}>{a.when} ago</span>
                  <div>
                    <div style={{fontSize:12, color:"var(--ink)"}}>{a.act}</div>
                    <div style={{fontSize:10.5, color:"var(--ink-4)", marginTop:2, fontFamily:"var(--font-mono)"}}>{a.who.toUpperCase()} · {a.tag.toUpperCase()}</div>
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
window.PageDashboard = PageDashboard;
