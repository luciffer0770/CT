/* Top bar + Sidebar shell */

function TopBar({ state, setTakt }) {
  const { totalCT, takt, efficiency, bottleneck } = state;
  const overTakt = totalCT > takt;
  return (
    <div className="topbar">
      <div className="topbar-metrics">
        <div className="metric-chip info">
          <span className="dot" style={{ background: "var(--blue)" }}/>
          <div>
            <div className="lbl">Total Cycle</div>
            <div className="val">{totalCT}<span style={{ color: "var(--ink-4)", fontWeight: 500 }}>s</span></div>
          </div>
        </div>
        <div className="metric-chip">
          <span className="dot" style={{ background: "var(--ink-3)" }}/>
          <div>
            <div className="lbl">Takt</div>
            <div style={{display:"flex", alignItems:"center"}}>
              <input type="number" value={takt} onChange={e => setTakt(Number(e.target.value))} min={30} max={600}/>
              <span style={{ color: "var(--ink-4)", fontWeight: 500, fontSize:11 }}>s</span>
            </div>
          </div>
        </div>
        <div className={`metric-chip ${overTakt ? "critical" : "good"}`}>
          <span className="dot" style={{ background: overTakt ? "var(--red)" : "var(--green)" }}/>
          <div>
            <div className="lbl">Efficiency</div>
            <div className="val">{efficiency}<span style={{ fontWeight: 500 }}>%</span></div>
          </div>
        </div>
        <div className="metric-chip critical">
          <span className="dot" style={{ background: "var(--red)", boxShadow: "0 0 0 3px rgba(225,29,46,.18)" }}/>
          <div>
            <div className="lbl">Bottleneck</div>
            <div className="val" style={{ fontSize: 12 }}>{bottleneck ? bottleneck.name : "—"}</div>
          </div>
        </div>
        <div className="metric-chip">
          <span className="dot" style={{ background: "var(--cyan)" }}/>
          <div>
            <div className="lbl">Line</div>
            <div className="val" style={{fontSize:12}}>LINE-07 · SHIFT B</div>
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="search">
          <Icon name="search" size={14} style={{ color: "var(--ink-4)" }}/>
          <input placeholder="Search steps, machines, OPC tags..."/>
          <span className="kbd">⌘ K</span>
        </div>
        <button className="icon-btn" title="Notifications"><Icon name="bell" size={14}/></button>
        <button className="icon-btn" title="Export"><Icon name="export" size={14}/></button>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage }) {
  const items = [
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "builder",   label: "Cycle Builder", icon: "build"    },
    { id: "gantt",     label: "Gantt View",    icon: "gantt"    },
    { id: "analytics", label: "Analytics",     icon: "analytics", badge: "3" },
    { id: "sim",       label: "Simulation",    icon: "sim"      },
    { id: "reports",   label: "Reports",       icon: "report"   },
    { id: "settings",  label: "Settings",      icon: "settings" },
  ];
  return (
    <>
      <div className="brand">
        <div>
          <div className="brand-name">Cycle Time Analyzer</div>
          <div className="brand-sub">Industrial · v4.12</div>
        </div>
      </div>
      <aside className="sidebar">
        <div className="nav-group-label">Workspace</div>
        {items.slice(0,6).map(it => (
          <div key={it.id} className={`nav-item ${page === it.id ? "active" : ""}`} onClick={() => setPage(it.id)}>
            <span className="nav-icon"><Icon name={it.icon} size={15}/></span>
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </div>
        ))}
        <div className="nav-group-label">System</div>
        {items.slice(6).map(it => (
          <div key={it.id} className={`nav-item ${page === it.id ? "active" : ""}`} onClick={() => setPage(it.id)}>
            <span className="nav-icon"><Icon name={it.icon} size={15}/></span>
            <span>{it.label}</span>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar">MB</div>
          <div>
            <div className="who">M. Becker</div>
            <div className="role">Process Engineer · Plant 3</div>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusBar({ state }) {
  return (
    <div className="statusbar">
      <span className="dot-live"/>
      <span>CONNECTED · OPC-UA @ 192.168.14.22</span>
      <span className="sep"/>
      <span>{state.steps.length} STEPS · TAKT {state.takt}s · CT {state.totalCT}s</span>
      <span className="sep"/>
      <span style={{ color: state.totalCT > state.takt ? "var(--red)" : "var(--green)" }}>
        {state.totalCT > state.takt ? "OVER TAKT" : "WITHIN TAKT"}
      </span>
      <span className="sep"/>
      <span>LINE-07 / SHIFT B / 2026-04-18 09:42:11</span>
      <span style={{ marginLeft: "auto" }}>v14 · SAVED</span>
    </div>
  );
}

window.TopBar = TopBar;
window.Sidebar = Sidebar;
window.StatusBar = StatusBar;
