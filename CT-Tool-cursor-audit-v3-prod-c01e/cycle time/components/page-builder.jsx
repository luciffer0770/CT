/* Cycle Builder - 3-column with drag/drop */

function PageBuilder({ state, steps, setSteps, selectedId, setSelectedId }) {
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);

  const onDragStart = (id) => setDragId(id);
  const onDragEnter = (id) => setOverId(id);
  const onDragEnd = () => {
    if (dragId && overId && dragId !== overId) {
      const from = steps.findIndex(s => s.id === dragId);
      const to = steps.findIndex(s => s.id === overId);
      const next = [...steps];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      setSteps(next);
    }
    setDragId(null); setOverId(null);
  };

  const sel = state.steps.find(s => s.id === selectedId) || state.steps[3];
  const stepById = {};
  state.steps.forEach(s => stepById[s.id] = s);

  const updateStep = (id, patch) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> CYCLE BUILDER</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Cycle Builder</h1>
          <div className="page-sub">Drag steps to reorder. Edit machine, operator and setup times — totals update live.</div>
        </div>
        <div className="toolbar">
          <button className="btn"><Icon name="plus" size={13}/> Add step</button>
          <button className="btn"><Icon name="layers" size={13}/> Parallelize</button>
          <button className="btn accent"><Icon name="check" size={13}/> Save v15</button>
        </div>
      </div>

      <div className="ribbon">
        <span className="chip"><b>CT</b> {state.totalCT}s</span>
        <span className="chip" style={{background:"var(--blue-50)", borderColor:"rgba(30,64,175,.25)"}}><b>Machine</b> {state.sumMachine}s</span>
        <span className="chip" style={{background:"var(--cyan-50)", borderColor:"rgba(6,182,212,.25)"}}><b>Operator</b> {state.sumOp}s</span>
        <span className="chip" style={{background:"var(--violet-50)", borderColor:"rgba(109,40,217,.25)"}}><b>Setup</b> {state.sumSetup}s</span>
        <span className="chip" style={{marginLeft:"auto", background:"var(--red-50)", borderColor:"rgba(225,29,46,.25)"}}><b style={{color:"var(--red)"}}>B/N</b> {state.bottleneck?.name}</span>
      </div>

      <div className="builder">
        {/* LEFT: Step cards */}
        <div className="card">
          <div className="card-head">
            <h3>Steps <span style={{color:"var(--ink-4)", fontWeight:400, fontFamily:"var(--font-mono)", fontSize:10, marginLeft:6}}>{steps.length}</span></h3>
            <span className="sub">DRAG TO REORDER</span>
          </div>
          <div className="step-list no-select" onDragOver={(e)=>e.preventDefault()}>
            {state.steps.map((s, i) => (
              <div key={s.id}
                   className={`step-card ${selectedId === s.id ? "selected" : ""} ${s.bottleneck ? "bottleneck" : ""} ${dragId === s.id ? "dragging" : ""}`}
                   draggable
                   onDragStart={() => onDragStart(s.id)}
                   onDragEnter={() => onDragEnter(s.id)}
                   onDragEnd={onDragEnd}
                   onDragOver={(e) => e.preventDefault()}
                   onClick={() => setSelectedId(s.id)}>
                <div className="step-top">
                  <div style={{display:"flex", alignItems:"center", gap:6}}>
                    <Icon name="grip" size={14} style={{color:"var(--ink-4)", cursor:"grab"}}/>
                    <span className="step-idx">{String(i+1).padStart(2,"0")}</span>
                    <span className="step-name">{s.name}</span>
                  </div>
                  {s.bottleneck && <span className="tag red">B/N</span>}
                  {!s.bottleneck && s.critical && <span className="tag blue">CRIT</span>}
                </div>
                <div className="step-meta">
                  <div className="m machine"><div className="k">MACH</div><div className="v">{s.machine}s</div></div>
                  <div className="m op"><div className="k">OP</div><div className="v">{s.op}s</div></div>
                  <div className="m setup"><div className="k">SET</div><div className="v">{s.setup}s</div></div>
                </div>
                <div className="step-deps">
                  <span style={{color:"var(--ink-4)"}}>DEPS</span>
                  {s.deps.length === 0
                    ? <span style={{color:"var(--ink-4)"}}>—</span>
                    : s.deps.map(d => <span key={d} className="tag" style={{fontSize:9}}>{(stepById[d]?.name || d).slice(0,12)}</span>)
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Live Gantt */}
        <div className="card">
          <div className="card-head">
            <h3>Live Gantt</h3>
            <div className="legend">
              <span className="item"><span className="swatch" style={{background:"var(--violet)"}}/>Setup</span>
              <span className="item"><span className="swatch" style={{background:"var(--blue)"}}/>Machine</span>
              <span className="item"><span className="swatch" style={{background:"var(--cyan)"}}/>Operator</span>
            </div>
          </div>
          <div className="card-body tight">
            <Gantt steps={state.steps} totalCT={state.totalCT} takt={state.takt} tickEvery={30}/>
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display:"flex", alignItems:"center", gap:10, fontSize:11.5, color:"var(--ink-3)" }}>
            <Icon name="clock" size={13}/> Updated just now — topological re-scheduling on change.
          </div>
        </div>

        {/* RIGHT: Analytics for selected step */}
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          <div className="card">
            <div className="card-head"><h3>Step Inspector</h3><span className="sub">{String(state.steps.findIndex(s=>s.id===sel.id)+1).padStart(2,"0")}</span></div>
            <div className="card-body" style={{display:"grid", gap:10}}>
              <div style={{fontSize:13, fontWeight:600}}>{sel.name}</div>
              {[
                { k: "machine", label: "Machine time", max: 120, color: "var(--blue)" },
                { k: "op", label: "Operator time",  max: 60,  color: "var(--cyan)" },
                { k: "setup", label: "Setup time",   max: 30,  color: "var(--violet)" },
              ].map(f => (
                <div key={f.k} className="slider-row" style={{padding: "6px 0"}}>
                  <div className="k">{f.label}<small>max {f.max}s</small></div>
                  <input type="range" min={0} max={f.max} value={sel[f.k]} onChange={e => updateStep(sel.id, { [f.k]: Number(e.target.value) })} style={{ accentColor: f.color }}/>
                  <div className="v" style={{ color: f.color }}>{sel[f.k]}s</div>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>Total step</div>
              <div className="val" style={{fontFamily:"var(--font-mono)", fontSize:24, fontWeight:600, color:"var(--ink)"}}>{sel.duration}<span style={{color:"var(--ink-4)",fontSize:14}}>s</span></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Wait & Slack</h3><span className="sub">vs critical path</span></div>
            <div className="card-body">
              {state.steps.slice(0,6).map(s => {
                const slack = s.critical ? 0 : Math.max(0, state.totalCT - s.end);
                return (
                  <HBar key={s.id} label={s.name.split(" ").slice(0,2).join(" ")} value={slack} max={Math.max(40, state.totalCT/4)} color={slack===0?"var(--red)":"var(--cyan)"}/>
                );
              })}
            </div>
          </div>

          <div className="card" style={{borderColor:"rgba(225,29,46,.3)"}}>
            <div className="card-head">
              <h3 style={{color:"var(--red)"}}>Bottleneck Alert</h3>
              <span className="tag red">ACTIVE</span>
            </div>
            <div className="card-body" style={{fontSize:12, color:"var(--ink-2)"}}>
              <b style={{color:"var(--red)"}}>{state.bottleneck?.name}</b> is {((state.bottleneck?.duration / state.totalCT)*100).toFixed(0)}% of cycle and defines takt limit.
              <div style={{marginTop:8, display:"flex", gap:6}}>
                <button className="btn danger" style={{fontSize:11, height:26}}>Jump to step</button>
                <button className="btn" style={{fontSize:11, height:26}}>Simulate fix</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
window.PageBuilder = PageBuilder;
