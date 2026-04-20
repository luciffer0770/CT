import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { useStore } from "../store/useStore.js";

export function Sidebar() {
  const page = useStore(s => s.page);
  const setPage = useStore(s => s.setPage);
  const settings = useStore(s => s.settings);
  const collapsed = useStore(s => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useStore(s => s.toggleSidebarCollapsed);
  const items = [
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "builder",   label: "Cycle Builder", icon: "build"    },
    { id: "gantt",     label: "Gantt View",    icon: "gantt"    },
    { id: "analytics", label: "Analytics",     icon: "analytics" },
    { id: "sim",       label: "Simulation",    icon: "sim"      },
    { id: "tools",     label: "Industrial Tools", icon: "cpu"   },
    { id: "reports",   label: "Reports",       icon: "report"   },
    { id: "settings",  label: "Settings",      icon: "settings" },
  ];
  return (
    <>
      <div className="brand">
        <div className={collapsed ? "brand-text brand-text-collapsed" : "brand-text"}>
          <div className="brand-name">Cycle Time Analyzer</div>
          <div className="brand-sub">Industrial · v4.12</div>
        </div>
        <button
          type="button"
          className="icon-btn brand-collapse-btn"
          onClick={() => toggleSidebarCollapsed()}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "panel-right" : "panel-left"} size={16}/>
        </button>
      </div>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`} aria-label="Main navigation">
        <div className="nav-group-label">Workspace</div>
        {items.slice(0, 7).map(it => (
          <div
            key={it.id}
            className={`nav-item ${page === it.id ? "active" : ""}`}
            onClick={() => setPage(it.id)}
            title={collapsed ? it.label : undefined}
          >
            <span className="nav-icon"><Icon name={it.icon} size={15}/></span>
            <span className="nav-label">{it.label}</span>
          </div>
        ))}
        <div className="nav-group-label">System</div>
        {items.slice(7).map(it => (
          <div
            key={it.id}
            className={`nav-item ${page === it.id ? "active" : ""}`}
            onClick={() => setPage(it.id)}
            title={collapsed ? it.label : undefined}
          >
            <span className="nav-icon"><Icon name={it.icon} size={15}/></span>
            <span className="nav-label">{it.label}</span>
          </div>
        ))}

        <div
          className="sidebar-footer"
          onClick={() => setPage("settings")}
          title={collapsed ? "Settings" : "Open profile settings"}
          style={{ cursor: "pointer" }}
        >
          <div
            className="avatar"
            style={{
              background: `linear-gradient(135deg, ${settings.profileAvatarColor || "#6D28D9"}, ${settings.accent || "#1E40AF"})`,
            }}
          >
            {(settings.profileInitials || "MB").slice(0, 2).toUpperCase()}
          </div>
          <div className="sidebar-footer-text">
            <div className="who">{settings.profileName || "M. Becker"}</div>
            <div className="role">{settings.profileRole || "Process Engineer"}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopBar({ schedule }) {
  const taktTime = useStore(s => s.taktTime);
  const setTakt = useStore(s => s.setTakt);
  const settings = useStore(s => s.settings);
  const togglePalette = useStore(s => s.togglePalette);
  const toggleShortcuts = useStore(s => s.toggleShortcuts);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const canUndo = useStore(s => s._past.length > 0);
  const canRedo = useStore(s => s._future.length > 0);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const [search, setSearch] = useState("");
  const setPage = useStore(s => s.setPage);
  const steps = useStore(s => s.steps);
  const setSelectedId = useStore(s => s.setSelectedId);
  const sidebarCollapsed = useStore(s => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useStore(s => s.toggleSidebarCollapsed);

  const { totalCycleTime, efficiency, bottleneck } = schedule;
  const overTakt = totalCycleTime > taktTime;

  const searchResults = search
    ? steps.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="topbar">
      <div className="topbar-metrics">
        <div className="metric-chip info">
          <span className="dot" style={{ background: "var(--blue)" }}/>
          <div>
            <div className="lbl">Total Cycle</div>
            <div className="val">{totalCycleTime}<span style={{ color: "var(--ink-4)", fontWeight: 500 }}>s</span></div>
          </div>
        </div>
        <div className="metric-chip">
          <span className="dot" style={{ background: "var(--ink-3)" }}/>
          <div>
            <div className="lbl">Takt</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input type="number" value={taktTime} onChange={e => setTakt(Number(e.target.value) || 0)} min={5} max={9999}/>
              <span style={{ color: "var(--ink-4)", fontWeight: 500, fontSize: 11 }}>s</span>
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
        <div className={`metric-chip ${bottleneck ? "critical" : ""}`}>
          <span className="dot" style={{ background: "var(--red)", boxShadow: "0 0 0 3px rgba(225,29,46,.18)" }}/>
          <div>
            <div className="lbl">Bottleneck</div>
            <div className="val allow-wrap" style={{ fontSize: 12 }} title={bottleneck ? bottleneck.name : ""}>{bottleneck ? bottleneck.name : "—"}</div>
          </div>
        </div>
        <div className="metric-chip">
          <span className="dot" style={{ background: "var(--cyan)" }}/>
          <div>
            <div className="lbl">Line</div>
            <div className="val allow-wrap" style={{ fontSize: 12 }} title={`${settings.line} · ${settings.shift}`}>{settings.line} · {settings.shift}</div>
          </div>
        </div>
      </div>
      <div className="topbar-right" style={{ position: "relative" }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => toggleSidebarCollapsed()}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <Icon name={sidebarCollapsed ? "panel-right" : "panel-left"} size={16}/>
        </button>
        <div className="search" onClick={() => togglePalette(true)} style={{ cursor: "pointer" }} title="Open command palette (Cmd/Ctrl+K)">
          <Icon name="search" size={14} style={{ color: "var(--ink-4)" }}/>
          <input
            placeholder="Search steps · commands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <span className="kbd">⌘ K</span>
        </div>
        {searchResults.length > 0 && (
          <div className="card" style={{ position: "absolute", top: 44, right: 160, width: 280, zIndex: 30 }}>
            {searchResults.map(s => (
              <div
                key={s.id}
                style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}
                onMouseDown={() => { setPage("builder"); setSelectedId(s.id); setSearch(""); }}
              >
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="mono muted" style={{ fontSize: 10 }}>{s.id}</div>
              </div>
            ))}
          </div>
        )}
        <button className="icon-btn" title="Undo (Cmd+Z)" onClick={undo} disabled={!canUndo}><Icon name="reset" size={14}/></button>
        <button className="icon-btn" title="Redo (Cmd+Shift+Z)" onClick={redo} disabled={!canRedo}><Icon name="history" size={14}/></button>
        <button className="icon-btn" title="Save version (Cmd+S)" onClick={() => saveNewVersion()}><Icon name="save" size={14}/></button>
        <button className="icon-btn" title="Shortcuts (?)" onClick={() => toggleShortcuts(true)}><Icon name="bell" size={14}/></button>
      </div>
    </div>
  );
}

export function StatusBar({ schedule }) {
  const taktTime = useStore(s => s.taktTime);
  const steps = useStore(s => s.steps);
  const settings = useStore(s => s.settings);
  const versionCount = useStore(s => s.versions.length);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const overTakt = schedule.totalCycleTime > taktTime;
  return (
    <div className="statusbar">
      <span className="dot-live"/>
      <span>AUTO-SAVE · LOCAL</span>
      <span className="sep"/>
      <span>{steps.length} STEPS · TAKT {taktTime}s · CT {schedule.totalCycleTime}s</span>
      <span className="sep"/>
      <span style={{ color: overTakt ? "var(--red)" : "var(--green)" }}>
        {overTakt ? "OVER TAKT" : "WITHIN TAKT"}
      </span>
      <span className="sep"/>
      <span>{settings.line} / {settings.shift} / {time.toLocaleTimeString()}</span>
      <span style={{ marginLeft: "auto" }}>v{versionCount}</span>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore(s => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
      ))}
    </div>
  );
}
