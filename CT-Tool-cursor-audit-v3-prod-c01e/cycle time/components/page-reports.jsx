/* Reports page - preview layout */
function PageReports({ state }) {
  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> REPORTS</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <div className="page-sub">Generate shift reports and export to PDF for quality & engineering reviews.</div>
        </div>
        <div className="toolbar">
          <button className="btn"><Icon name="clock" size={13}/> Schedule</button>
          <button className="btn primary"><Icon name="download" size={13}/> Export PDF</button>
        </div>
      </div>

      <div className="section-row">
        <div className="card col-4">
          <div className="card-head"><h3>Saved Reports</h3><span className="sub">12</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {[
              { id: "R-2026-0418-B", name: "Shift B · Apr 18", status: "ready" },
              { id: "R-2026-0418-A", name: "Shift A · Apr 18", status: "ready" },
              { id: "R-2026-0417-C", name: "Shift C · Apr 17", status: "ready" },
              { id: "R-2026-0417-B", name: "Shift B · Apr 17", status: "ready" },
              { id: "R-2026-0416-QC", name: "Weekly QC roll-up", status: "ready" },
            ].map((r, i) => (
              <div key={r.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }} className="report-row">
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--ink-4)", marginTop:2 }}>{r.id}</div>
                </div>
                <span className={`tag ${i===0?"blue":"green"}`}>{i===0?"OPEN":"READY"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-8">
          <div className="card-head">
            <div>
              <h3>Preview — R-2026-0418-B</h3>
              <div className="sub" style={{marginTop:2}}>SHIFT B · LINE 07 · APR 18, 2026</div>
            </div>
            <div className="toolbar">
              <button className="btn ghost">Page 1 / 3</button>
              <button className="btn"><Icon name="chev-right" size={13}/></button>
            </div>
          </div>
          <div className="card-body" style={{ background: "var(--bg-2)", padding: 16 }}>
            <div style={{ background: "white", padding: 28, boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" }}>
              <div className="prism"/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginTop: 14 }}>
                <div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--ink-4)", letterSpacing:".14em" }}>CYCLE TIME REPORT</div>
                  <h2 style={{ fontFamily:"var(--font-head)", fontSize: 22, margin: "4px 0 0", fontWeight: 600 }}>Line 07 · Shift B</h2>
                  <div style={{ fontSize: 12, color:"var(--ink-3)", marginTop: 4 }}>Prepared by M. Becker, Process Engineering · Plant 3</div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                  <div>DATE&nbsp;&nbsp;&nbsp;APR 18, 2026</div>
                  <div>REV&nbsp;&nbsp;&nbsp;&nbsp;v14</div>
                  <div>ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;R-2026-0418-B</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 10, marginTop: 18 }}>
                {[
                  { k: "CYCLE TIME", v: state.totalCT+"s", c: "var(--blue)" },
                  { k: "TAKT", v: state.takt+"s", c: "var(--ink)" },
                  { k: "EFFICIENCY", v: state.efficiency+"%", c: "var(--green)" },
                  { k: "BOTTLENECK", v: state.bottleneck?.name.split(" ")[0], c: "var(--red)", small: true },
                ].map(m => (
                  <div key={m.k} style={{ border: "1px solid var(--border)", padding: "10px 12px" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize: 9, color:"var(--ink-4)", letterSpacing:".12em" }}>{m.k}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize: m.small ? 14 : 22, fontWeight: 600, color: m.c, marginTop: 2 }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontFamily:"var(--font-head)", fontSize: 13, marginTop: 22, marginBottom: 8, letterSpacing: ".04em", textTransform: "uppercase", color:"var(--ink-3)" }}>Step Breakdown</h3>
              <table className="tbl">
                <thead><tr><th>#</th><th>Step</th><th style={{textAlign:"right"}}>M</th><th style={{textAlign:"right"}}>Op</th><th style={{textAlign:"right"}}>Set</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
                <tbody>
                  {state.steps.map((s, i) => (
                    <tr key={s.id}>
                      <td className="num" style={{color:"var(--ink-4)"}}>{String(i+1).padStart(2,"0")}</td>
                      <td>{s.name}</td>
                      <td className="num" style={{textAlign:"right"}}>{s.machine}</td>
                      <td className="num" style={{textAlign:"right"}}>{s.op}</td>
                      <td className="num" style={{textAlign:"right"}}>{s.setup}</td>
                      <td className="num" style={{textAlign:"right", fontWeight:600, color: s.bottleneck ? "var(--red)" : "var(--ink)" }}>{s.duration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ fontFamily:"var(--font-head)", fontSize: 13, marginTop: 22, marginBottom: 8, letterSpacing: ".04em", textTransform: "uppercase", color:"var(--ink-3)" }}>Gantt Snapshot</h3>
              <div style={{ border:"1px solid var(--border)", padding: 8 }}>
                <Gantt steps={state.steps} totalCT={state.totalCT} takt={state.takt} tickEvery={40} labelWidth={130}/>
              </div>

              <div style={{ marginTop: 22, display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--ink-4)" }}>
                <span>CYCLE TIME ANALYZER · INDUSTRIAL EDITION</span>
                <span>PAGE 1 / 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
window.PageReports = PageReports;
