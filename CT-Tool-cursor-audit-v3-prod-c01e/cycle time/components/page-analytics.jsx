/* Analytics - dense multi-chart page */
function PageAnalytics({ state }) {
  const { steps, totalCT, vaPct, nvaPct, bottleneck } = state;
  const maxDur = Math.max(...steps.map(s => s.duration));

  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> ANALYTICS</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">Bottleneck analysis, value-added ratio, distributions and comparisons.</div>
        </div>
        <div className="toolbar">
          <button className="btn"><Icon name="clock" size={13}/> Last 7 days</button>
          <button className="btn"><Icon name="filter" size={13}/> Segments</button>
          <button className="btn primary"><Icon name="download" size={13}/> Export CSV</button>
        </div>
      </div>

      <div className="insight" style={{ marginBottom: 12 }}>
        <div className="ic"><Icon name="zap" size={15}/></div>
        <div className="txt">Reducing <b>{bottleneck?.name}</b> by <b>10%</b> ({bottleneck?.machine}s → {Math.round(bottleneck?.machine*0.9)}s) improves total cycle time by <b>~6%</b> and increases hourly throughput by <b>+2 units</b>.</div>
        <button className="btn accent" style={{height:28}}>Apply in simulation</button>
      </div>

      <div className="section-row">
        <div className="card col-8">
          <div className="card-head">
            <h3>Bottleneck Analysis</h3>
            <span className="sub">STEP DURATION RANKED</span>
          </div>
          <div className="card-body">
            {[...steps].sort((a,b)=>b.duration-a.duration).map((s,i) => (
              <div key={s.id} className="hbar-row" style={{ gridTemplateColumns: "40px 160px 1fr 80px" }}>
                <div style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-4)"}}>#{i+1}</div>
                <div className="lbl">{s.name}</div>
                <div className="track" style={{ height: 14 }}>
                  <div className="fill" style={{ width: `${(s.machine/maxDur)*100}%`, background: "var(--blue)" }}/>
                  <div className="fill" style={{ left: `${(s.machine/maxDur)*100}%`, width: `${(s.op/maxDur)*100}%`, background: "var(--cyan)" }}/>
                  <div className="fill" style={{ left: `${((s.machine+s.op)/maxDur)*100}%`, width: `${(s.setup/maxDur)*100}%`, background: "var(--violet)" }}/>
                  {s.bottleneck && <div style={{position:"absolute", inset:0, border:"1.5px solid var(--red)", borderRadius:2}}/>}
                </div>
                <div className="v" style={{ fontWeight: s.bottleneck ? 600 : 500, color: s.bottleneck ? "var(--red)" : "var(--ink)" }}>{s.duration}s</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head"><h3>Value-added Ratio</h3><span className="sub">VA vs NVA</span></div>
          <div className="card-body">
            <div className="donut-wrap">
              <Donut parts={[
                { value: vaPct, color: "var(--green)" },
                { value: nvaPct, color: "var(--red)" },
              ]}/>
              <div style={{ display:"grid", gap: 8 }}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}>
                  <span style={{display:"inline-flex", alignItems:"center", gap:6}}><span className="swatch" style={{width:10, height:10, background:"var(--green)", borderRadius:2, display:"inline-block"}}/>Value-added</span>
                  <span className="num" style={{fontFamily:"var(--font-mono)", fontWeight:600}}>{vaPct}%</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}>
                  <span style={{display:"inline-flex", alignItems:"center", gap:6}}><span className="swatch" style={{width:10, height:10, background:"var(--red)", borderRadius:2, display:"inline-block"}}/>Non VA (setup)</span>
                  <span className="num" style={{fontFamily:"var(--font-mono)", fontWeight:600}}>{nvaPct}%</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12, paddingTop: 8, borderTop:"1px solid var(--border)"}}>
                  <span style={{color:"var(--ink-4)"}}>Target VA</span>
                  <span style={{fontFamily:"var(--font-mono)", fontWeight:600}}>≥ 85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Cycle Time Distribution</h3><span className="sub">OVER 30 UNITS</span></div>
          <div className="card-body">
            <Histogram totalCT={totalCT} takt={state.takt}/>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Step Comparison</h3><span className="sub">CURRENT vs PLANNED</span></div>
          <div className="card-body">
            {steps.slice(0, 6).map(s => {
              const planned = Math.round(s.duration * (s.bottleneck ? 0.7 : 0.95));
              const over = s.duration - planned;
              return (
                <div key={s.id} className="hbar-row" style={{ gridTemplateColumns: "140px 1fr 1fr 60px" }}>
                  <div className="lbl" style={{fontSize: 11.5}}>{s.name}</div>
                  <div className="track"><div className="fill" style={{ width: `${(planned/maxDur)*100}%`, background: "var(--ink-4)" }}/></div>
                  <div className="track"><div className="fill" style={{ width: `${(s.duration/maxDur)*100}%`, background: over>0 ? "var(--red)" : "var(--green)" }}/></div>
                  <div className="v" style={{ color: over>0 ? "var(--red)" : "var(--green)" }}>{over>0?"+":""}{over}s</div>
                </div>
              );
            })}
            <div className="legend" style={{ marginTop: 10, borderTop:"1px solid var(--border)", paddingTop: 8 }}>
              <span className="item"><span className="swatch" style={{background:"var(--ink-4)"}}/>Planned</span>
              <span className="item"><span className="swatch" style={{background:"var(--red)"}}/>Over</span>
              <span className="item"><span className="swatch" style={{background:"var(--green)"}}/>Under</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Histogram({ totalCT, takt }) {
  // Simulated distribution
  const bins = [];
  const center = totalCT;
  for (let i = -6; i <= 6; i++) {
    const v = Math.max(0, Math.round(30 * Math.exp(-Math.pow(i, 2) / 8) + (i%2===0 ? 2 : 0)));
    bins.push({ t: center + i * 4, v });
  }
  const max = Math.max(...bins.map(b => b.v));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap: 6, height: 180, paddingTop: 12, position:"relative" }}>
      {bins.map((b, i) => {
        const over = b.t > takt;
        return (
          <div key={i} style={{ flex: 1, display:"flex", flexDirection:"column", alignItems:"center", gap: 4 }}>
            <div style={{
              width: "100%",
              height: `${(b.v/max)*150}px`,
              background: over ? "var(--red)" : "var(--blue)",
              opacity: i === 6 ? 1 : 0.8,
              borderRadius: "2px 2px 0 0",
              transition: "height 300ms var(--ease)"
            }}/>
            <div style={{fontFamily:"var(--font-mono)", fontSize: 9.5, color:"var(--ink-4)"}}>{b.t}s</div>
          </div>
        );
      })}
      <div style={{ position:"absolute", left: `${((takt - bins[0].t)/(bins[bins.length-1].t - bins[0].t))*100}%`, top:0, bottom: 18, borderLeft: "1.5px dashed var(--red)" }}>
        <span style={{ position:"absolute", top: 0, left: 3, fontFamily:"var(--font-mono)", fontSize: 9, color:"var(--red)", background:"var(--surface)", padding: "0 3px" }}>TAKT {takt}s</span>
      </div>
    </div>
  );
}

window.PageAnalytics = PageAnalytics;
