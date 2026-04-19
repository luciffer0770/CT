/* Settings */
function PageSettings({ settings, setSettings }) {
  const set = (patch) => setSettings({ ...settings, ...patch });
  return (
    <>
      <div className="crumbs">WORKSPACE <span className="sep">/</span> LINE-07 <span className="sep">/</span> SETTINGS</div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Line configuration, defaults and workspace preferences.</div>
        </div>
        <div className="toolbar">
          <button className="btn accent"><Icon name="check" size={13}/> Save changes</button>
        </div>
      </div>

      <div className="section-row">
        <div className="card col-6">
          <div className="card-head"><h3>Units & Defaults</h3><span className="sub">GLOBAL</span></div>
          <div className="card-body" style={{ display:"grid", gap: 14 }}>
            <Row label="Time units" help="Used across cycle, takt and reports.">
              <Seg value={settings.units} options={["sec","min"]} onChange={(v)=>set({units:v})}/>
            </Row>
            <Row label="Default takt time" help="Applied to new lines.">
              <div className="search" style={{minWidth:120, width:160}}>
                <input type="number" value={settings.defaultTakt} onChange={e=>set({defaultTakt:Number(e.target.value)})}/>
                <span style={{color:"var(--ink-4)", fontFamily:"var(--font-mono)", fontSize:10}}>s</span>
              </div>
            </Row>
            <Row label="Rounding" help="Display precision for cycle values.">
              <Seg value={settings.rounding} options={["0.1","1","5"]} onChange={(v)=>set({rounding:v})}/>
            </Row>
            <Row label="Data refresh" help="Pull rate from OPC-UA source.">
              <Seg value={settings.refresh} options={["1s","5s","15s","off"]} onChange={(v)=>set({refresh:v})}/>
            </Row>
          </div>
        </div>

        <div className="card col-6">
          <div className="card-head"><h3>Appearance</h3><span className="sub">WORKSPACE</span></div>
          <div className="card-body" style={{ display:"grid", gap: 14 }}>
            <Row label="Theme" help="Current session only.">
              <Seg value={settings.theme} options={["light","auto","dark"]} onChange={(v)=>set({theme:v})}/>
            </Row>
            <Row label="Accent" help="Used on primary actions.">
              <div style={{display:"flex", gap:6}}>
                {["#1E40AF","#6D28D9","#06B6D4","#22C55E","#E11D2E"].map(c => (
                  <button key={c} onClick={()=>set({accent:c})} style={{ width:24, height:24, border: settings.accent===c ? "2px solid var(--ink)" : "1px solid var(--border)", borderRadius:4, background:c, cursor:"pointer" }}/>
                ))}
              </div>
            </Row>
            <Row label="Compact density" help="Tighter spacing in tables and cards.">
              <Toggle value={settings.compact} onChange={(v)=>set({compact:v})}/>
            </Row>
            <Row label="Show grid backgrounds" help="Engineering grid in Gantt / canvas views.">
              <Toggle value={settings.grid} onChange={(v)=>set({grid:v})}/>
            </Row>
          </div>
        </div>

        <div className="card col-12" style={{borderColor:"rgba(225,29,46,.25)"}}>
          <div className="card-head">
            <h3 style={{color:"var(--red)"}}>Danger zone</h3>
            <span className="tag red">DESTRUCTIVE</span>
          </div>
          <div className="card-body" style={{ display:"grid", gridTemplateColumns:"1fr auto", gap: 12, alignItems:"center" }}>
            <div>
              <div style={{fontSize:12.5, fontWeight:600}}>Reset line data</div>
              <div style={{fontSize:11.5, color:"var(--ink-3)", marginTop:2}}>Restore default 10-step cycle for LINE-07. Simulation history is preserved.</div>
            </div>
            <button className="btn danger">Reset data</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, help, children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap: 16, alignItems:"center" }}>
      <div>
        <div style={{fontSize:12.5, fontWeight:600, color:"var(--ink)"}}>{label}</div>
        {help && <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>{help}</div>}
      </div>
      <div style={{ justifySelf:"start" }}>{children}</div>
    </div>
  );
}
function Seg({ value, options, onChange }) {
  return (
    <div style={{ display:"inline-flex", border:"1px solid var(--border)", borderRadius: 4, padding: 2, background:"var(--surface-2)" }}>
      {options.map(o => (
        <button key={o} onClick={()=>onChange(o)} style={{
          border: 0, background: value === o ? "var(--surface)" : "transparent",
          boxShadow: value === o ? "var(--shadow-sm)" : "none",
          padding: "5px 12px", fontSize: 11.5, fontWeight: 600,
          color: value === o ? "var(--ink)" : "var(--ink-3)",
          fontFamily: "var(--font-mono)", cursor: "pointer", borderRadius: 3
        }}>{o.toUpperCase()}</button>
      ))}
    </div>
  );
}
function Toggle({ value, onChange }) {
  return (
    <button onClick={()=>onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 12, border: "1px solid var(--border)",
      background: value ? "var(--blue)" : "var(--bg-2)", position:"relative", cursor:"pointer", transition: "all 200ms var(--ease)"
    }}>
      <span style={{
        position:"absolute", top: 2, left: value ? 20 : 2, width: 16, height: 16,
        borderRadius: 10, background: "white", transition: "all 200ms var(--ease)", boxShadow: "0 1px 2px rgba(0,0,0,.15)"
      }}/>
    </button>
  );
}
window.PageSettings = PageSettings;
