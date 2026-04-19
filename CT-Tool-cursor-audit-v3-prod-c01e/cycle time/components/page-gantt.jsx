/* Gantt View - full-screen */
function PageGantt({ state }) {
  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> GANTT</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Gantt View</h1>
          <div className="page-sub">Full schedule with dependencies, parallelism and takt reference.</div>
        </div>
        <div className="toolbar">
          <button className="btn"><Icon name="filter" size={13}/> Filter</button>
          <button className="btn"><Icon name="layers" size={13}/> Dependencies</button>
          <button className="btn primary"><Icon name="download" size={13}/> Export SVG</button>
        </div>
      </div>

      <div className="ribbon">
        <span className="chip"><b>CT</b> {state.totalCT}s</span>
        <span className="chip"><b>Takt</b> {state.takt}s</span>
        <span className="chip" style={{background: state.totalCT > state.takt ? "var(--red-50)" : "var(--green-50)", borderColor: state.totalCT > state.takt ? "rgba(225,29,46,.25)" : "rgba(34,197,94,.25)"}}>
          <b style={{color: state.totalCT > state.takt ? "var(--red)" : "var(--green)"}}>
            {state.totalCT > state.takt ? `OVER TAKT +${state.totalCT - state.takt}s` : `WITHIN TAKT −${state.takt - state.totalCT}s`}
          </b>
        </span>
        <div className="legend" style={{marginLeft:"auto"}}>
          <span className="item"><span className="swatch" style={{background:"var(--blue)"}}/>Machine</span>
          <span className="item"><span className="swatch" style={{background:"var(--cyan)"}}/>Operator</span>
          <span className="item"><span className="swatch" style={{background:"var(--violet)"}}/>Setup</span>
          <span className="item"><span className="swatch" style={{background:"repeating-linear-gradient(45deg, #FCA5A5 0 4px, #F87171 4px 8px)"}}/>Wait</span>
          <span className="item"><span className="swatch" style={{background:"var(--green)"}}/>Optimal</span>
          <span className="item"><span className="swatch" style={{background:"var(--red)"}}/>Bottleneck</span>
        </div>
      </div>

      <div className="card grid-bg">
        <div className="card-head">
          <h3>Schedule · {state.steps.length} steps</h3>
          <span className="sub">0 → {state.totalCT}s</span>
        </div>
        <div className="card-body tight" style={{ minHeight: 540 }}>
          <Gantt steps={state.steps} totalCT={state.totalCT} takt={state.takt} tickEvery={20} height={40} labelWidth={180}/>
        </div>
      </div>

      <div style={{ height: 12 }}/>
      <div className="section-row">
        <div className="card col-6">
          <div className="card-head"><h3>Critical Path</h3><span className="sub">LONGEST CHAIN</span></div>
          <div className="card-body">
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              {state.steps.filter(s => s.critical).map((s, i, arr) => (
                <React.Fragment key={s.id}>
                  <span className={`tag ${s.bottleneck ? "red" : "blue"}`} style={{padding: "4px 8px", fontSize: 11}}>{s.name}</span>
                  {i < arr.length - 1 && <Icon name="chev-right" size={12} style={{color:"var(--ink-4)"}}/>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="card col-6">
          <div className="card-head"><h3>Parallel Branches</h3><span className="sub">SAVINGS</span></div>
          <div className="card-body" style={{ fontSize: 12, color: "var(--ink-2)" }}>
            <HBar label="Sub-assembly ‖ Weld A" value={26} max={60} color="var(--green)"/>
            <HBar label="QC Vision ‖ Wiring" value={18} max={60} color="var(--green)"/>
            <HBar label="Mount ‖ Fastening" value={8} max={60} color="var(--cyan)"/>
          </div>
        </div>
      </div>
    </>
  );
}
window.PageGantt = PageGantt;
