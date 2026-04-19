/* Simulation - sliders & before/after */
function PageSimulation({ state, setSteps, baseline }) {
  const [adj, setAdj] = React.useState({});

  React.useEffect(() => {
    const reset = {};
    state.steps.forEach(s => { reset[s.id] = { m: 0, o: 0 }; });
    setAdj(reset);
  }, []); // init once

  const simSteps = state.steps.map(s => {
    const a = adj[s.id] || { m: 0, o: 0 };
    return { ...s,
      machine: Math.max(0, s.machine + a.m),
      op: Math.max(0, s.op + a.o),
    };
  });
  const simState = computeSchedule(simSteps, state.takt);

  const ctDelta = simState.totalCT - baseline.totalCT;
  const effDelta = simState.efficiency - baseline.efficiency;

  const apply = () => setSteps(simSteps);
  const reset = () => {
    const r = {}; state.steps.forEach(s => r[s.id] = { m:0, o:0 });
    setAdj(r);
  };

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> SIMULATION</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Simulation</h1>
          <div className="page-sub">What-if analysis. Adjust machine or operator time per step and see impact on takt, efficiency and bottleneck.</div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={reset}><Icon name="reset" size={13}/> Reset</button>
          <button className="btn"><Icon name="play" size={13}/> Run 1,000 trials</button>
          <button className="btn accent" onClick={apply}><Icon name="check" size={13}/> Apply to line</button>
        </div>
      </div>

      <div className="cmp-grid" style={{ marginBottom: 12 }}>
        <div className="cmp-cell">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <div className="lbl" style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-4)", letterSpacing:".1em"}}>BEFORE · BASELINE v14</div>
            <div className="tag">CURRENT</div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:8}}>
            <Metric k="Cycle" v={baseline.totalCT} u="s" color="var(--ink)"/>
            <Metric k="Efficiency" v={baseline.efficiency} u="%" color="var(--ink)"/>
            <Metric k="Bottleneck" v={baseline.bottleneck?.name.split(" ")[0]} u="" color="var(--red)" small/>
          </div>
          <div style={{ marginTop: 12 }}>
            <Gantt steps={baseline.steps} totalCT={baseline.totalCT} takt={baseline.takt} tickEvery={40} labelWidth={130}/>
          </div>
        </div>
        <div className="cmp-cell after">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <div className="lbl" style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--green)", letterSpacing:".1em"}}>AFTER · SIMULATION</div>
            <div className="tag green">PROJECTED</div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:8}}>
            <Metric k="Cycle" v={simState.totalCT} u="s" delta={ctDelta} color={ctDelta <= 0 ? "var(--green)" : "var(--red)"} invertDelta/>
            <Metric k="Efficiency" v={simState.efficiency} u="%" delta={effDelta} color={effDelta >= 0 ? "var(--green)" : "var(--red)"}/>
            <Metric k="Bottleneck" v={simState.bottleneck?.name.split(" ")[0]} u="" color="var(--red)" small/>
          </div>
          <div style={{ marginTop: 12 }}>
            <Gantt steps={simState.steps} totalCT={simState.totalCT} takt={simState.takt} tickEvery={40} labelWidth={130}/>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Adjust Step Times</h3>
          <span className="sub">Δ MACHINE / OPERATOR</span>
        </div>
        <div className="card-body" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 24 }}>
          {state.steps.map(s => {
            const a = adj[s.id] || { m: 0, o: 0 };
            return (
              <div key={s.id} style={{ borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
                  <div style={{fontSize: 12, fontWeight: 600}}>{s.name}</div>
                  {s.bottleneck && <span className="tag red">B/N</span>}
                </div>
                <div className="slider-row" style={{ padding: "4px 0", borderBottom: 0 }}>
                  <div className="k">Machine <small>{s.machine}s base</small></div>
                  <input type="range" min={-30} max={30} value={a.m} onChange={e => setAdj({...adj, [s.id]: { ...a, m: Number(e.target.value) }})} style={{accentColor:"var(--blue)"}}/>
                  <div className="v" style={{ color: a.m < 0 ? "var(--green)" : a.m > 0 ? "var(--red)" : "var(--ink)" }}>{a.m>=0?"+":""}{a.m}s</div>
                </div>
                <div className="slider-row" style={{ padding: "4px 0", borderBottom: 0 }}>
                  <div className="k">Operator <small>{s.op}s base</small></div>
                  <input type="range" min={-20} max={20} value={a.o} onChange={e => setAdj({...adj, [s.id]: { ...a, o: Number(e.target.value) }})} style={{accentColor:"var(--cyan)"}}/>
                  <div className="v" style={{ color: a.o < 0 ? "var(--green)" : a.o > 0 ? "var(--red)" : "var(--ink)" }}>{a.o>=0?"+":""}{a.o}s</div>
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
      <div style={{ fontSize: 10, color:"var(--ink-4)", letterSpacing:".1em", textTransform:"uppercase", fontWeight:600 }}>{k}</div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize: small ? 14 : 20, fontWeight: 600, color, marginTop: 2 }}>
        {v}<span style={{fontSize: small ? 10 : 12, color:"var(--ink-4)", fontWeight:500}}>{u}</span>
      </div>
      {typeof delta === "number" && (
        <div style={{ fontFamily:"var(--font-mono)", fontSize: 10, marginTop: 2, color: (invertDelta ? delta <= 0 : delta >= 0) ? "var(--green)" : "var(--red)" }}>
          {delta >= 0 ? "+" : ""}{delta}{u}
        </div>
      )}
    </div>
  );
}
window.PageSimulation = PageSimulation;
