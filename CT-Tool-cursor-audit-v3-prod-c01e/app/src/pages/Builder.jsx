import { useMemo, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import Gantt from "../components/Gantt.jsx";
import { HBar } from "../components/Charts.jsx";
import PageCrumbs from "../components/PageCrumbs.jsx";
import { useStore } from "../store/useStore.js";
import { suggestNextSteps, validateSteps, suggestOptimization } from "../engine/analytics.js";
import ExcelImportModal from "../components/ExcelImportModal.jsx";
import { analyzeImportFile, exportStepsToExcel, downloadTemplate } from "../engine/excel-lazy.js";

export default function Builder({ schedule }) {
  const steps = useStore(s => s.steps);
  const selectedId = useStore(s => s.selectedId);
  const setSelectedId = useStore(s => s.setSelectedId);
  const addStep = useStore(s => s.addStep);
  const updateStep = useStore(s => s.updateStep);
  const removeStep = useStore(s => s.removeStep);
  const removeSteps = useStore(s => s.removeSteps);
  const bulkAssignStation = useStore(s => s.bulkAssignStation);
  const bulkNudgeTime = useStore(s => s.bulkNudgeTime);
  const duplicateStep = useStore(s => s.duplicateStep);
  const reorderSteps = useStore(s => s.reorderSteps);
  const addToGroup = useStore(s => s.addToGroup);
  const ungroup = useStore(s => s.ungroup);
  const setDependencies = useStore(s => s.setDependencies);
  const replaceSteps = useStore(s => s.replaceSteps);
  const saveNewVersion = useStore(s => s.saveNewVersion);
  const exportProjectJSON = useStore(s => s.exportProjectJSON);
  const importProjectJSON = useStore(s => s.importProjectJSON);
  const taktTime = useStore(s => s.taktTime);
  const toast = useStore(s => s.toast);
  const setPage = useStore(s => s.setPage);
  const askConfirm = useStore(s => s.askConfirm);
  const settings = useStore(s => s.settings);
  const highlightCriticalPath = useStore(s => s.highlightCriticalPath);
  const builderStepListHeightPx = useStore(s => s.builderStepListHeightPx);
  const setBuilderStepListHeightPx = useStore(s => s.setBuilderStepListHeightPx);

  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [multiSelect, setMultiSelect] = useState(new Set());
  const fileRef = useRef(null);
  const jsonRef = useRef(null);
  const [excelImport, setExcelImport] = useState(null);

  const sel = schedule.steps.find(s => s.id === selectedId) || schedule.steps[0];
  const stepById = {};
  schedule.steps.forEach(s => { stepById[s.id] = s; });

  const warnings = useMemo(() => validateSteps(steps), [steps]);
  const suggestions = useMemo(() => suggestOptimization(steps, taktTime), [steps, taktTime]);

  const onDragStart = (id, e) => {
    setDragId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnter = (id) => setOverId(id);
  const onDragEnd = () => {
    if (dragId && overId && dragId !== overId) reorderSteps(dragId, overId);
    setDragId(null); setOverId(null);
  };

  const toggleMulti = (id, e) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const next = new Set(multiSelect);
      if (next.has(id)) next.delete(id); else next.add(id);
      setMultiSelect(next);
      setSelectedId(id);
    } else {
      setSelectedId(id);
      setMultiSelect(new Set());
    }
  };

  const onParallelize = () => {
    if (multiSelect.size < 2) {
      toast("Select at least 2 steps (Shift+Click) to parallelize", "error");
      return;
    }
    addToGroup(Array.from(multiSelect));
    setMultiSelect(new Set());
  };

  const onUngroup = () => {
    if (multiSelect.size === 0 && sel) { ungroup([sel.id]); return; }
    ungroup(Array.from(multiSelect));
    setMultiSelect(new Set());
  };

  const onImportXLSX = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const analyzed = await analyzeImportFile(f);
      setExcelImport(analyzed);
    } catch (err) {
      console.error(err);
      toast("Import failed: " + err.message, "error");
    }
    e.target.value = "";
  };

  const onImportJSON = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await importProjectJSON(f);
    e.target.value = "";
  };

  const onExport = () => exportStepsToExcel(steps, schedule);

  const onAddSuggested = (kind) => {
    const defs = {
      inspection: { name: "Inspection", machineTime: 4, operatorTime: 6, setupTime: 1, dependencies: sel ? [sel.id] : [] },
      transfer: { name: "Transfer", machineTime: 0, operatorTime: 2, setupTime: 0, transferTime: 4, dependencies: sel ? [sel.id] : [] },
      cooling: { name: "Cooling", machineTime: 10, operatorTime: 0, setupTime: 0, dependencies: sel ? [sel.id] : [] },
      quality: { name: "Quality Check", machineTime: 2, operatorTime: 8, setupTime: 1, dependencies: sel ? [sel.id] : [] },
      automation: { name: "Automation", machineTime: 18, operatorTime: 2, setupTime: 2, dependencies: sel ? [sel.id] : [] },
    };
    addStep(defs[kind] || defs.inspection);
  };

  const selectedArr = Array.from(multiSelect);

  return (
    <>
      <ExcelImportModal
        open={!!excelImport}
        data={excelImport}
        onClose={() => setExcelImport(null)}
        onImported={(res) => {
          if (!res.ok) {
            toast(res.message || "Import blocked", "error");
            return;
          }
          replaceSteps(res.steps);
          const w = (res.warns || res.issues || []).filter((i) => i.severity === "warn").length;
          toast(`Imported ${res.steps.length} step(s)${w ? ` · ${w} warning(s)` : ""}`, "success");
          setExcelImport(null);
        }}
      />
      <PageCrumbs line={settings.line} pageTitle="CYCLE BUILDER" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Cycle Builder</h1>
          <div className="page-sub">Drag to reorder. Shift+Click to multi-select then Parallelize / batch-edit. <span className="mono muted">N</span> adds a step.</div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={() => addStep()} title="N"><Icon name="plus" size={13}/> Add</button>
          <button className="btn" onClick={onParallelize}><Icon name="layers" size={13}/> Parallelize ({multiSelect.size})</button>
          <button className="btn" onClick={onUngroup}><Icon name="minus" size={13}/> Ungroup</button>
          <input type="file" ref={fileRef} style={{ display: "none" }} accept=".xlsx,.xls,.csv" onChange={onImportXLSX}/>
          <input type="file" ref={jsonRef} style={{ display: "none" }} accept=".json" onChange={onImportJSON}/>
          <button className="btn" onClick={() => fileRef.current?.click()} title="Import Excel / CSV"><Icon name="upload" size={13}/> Excel</button>
          <button className="btn" onClick={() => jsonRef.current?.click()} title="Import project JSON"><Icon name="upload" size={13}/> JSON</button>
          <button className="btn" onClick={downloadTemplate} title="Download Excel template"><Icon name="download" size={13}/> Template</button>
          <button className="btn" onClick={onExport}><Icon name="export" size={13}/> Export .xlsx</button>
          <button className="btn" onClick={exportProjectJSON}><Icon name="export" size={13}/> Export .json</button>
          <button className="btn accent" onClick={() => saveNewVersion()}><Icon name="save" size={13}/> Save version</button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="warning">
          <div className="ic"><Icon name="alert" size={14}/></div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)" }}>{warnings.length} validation warning{warnings.length === 1 ? "" : "s"}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              {warnings.slice(0, 2).map(w => w.msg).join(" · ")}{warnings.length > 2 ? " …" : ""}
            </div>
          </div>
          <span className="tag red">{warnings.length}</span>
        </div>
      )}

      {multiSelect.size > 0 && (
        <div className="bulk-bar">
          <span className="mono" style={{ fontWeight: 600 }}>{multiSelect.size} selected</span>
          <div style={{ flex: 1 }}/>
          <input
            className="input"
            placeholder="Assign station…"
            style={{ width: 140, height: 28 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                bulkAssignStation(selectedArr, e.target.value.trim());
                e.target.value = "";
                setMultiSelect(new Set());
              }
            }}
          />
          <button className="btn xs" onClick={() => bulkNudgeTime(selectedArr, "machineTime", -5)}><Icon name="arrow-down" size={11}/> Machine −5s</button>
          <button className="btn xs" onClick={() => bulkNudgeTime(selectedArr, "machineTime", +5)}><Icon name="arrow-up" size={11}/> Machine +5s</button>
          <button className="btn xs" onClick={() => bulkNudgeTime(selectedArr, "operatorTime", -5)}><Icon name="arrow-down" size={11}/> Op −5s</button>
          <button className="btn xs" onClick={() => bulkNudgeTime(selectedArr, "operatorTime", +5)}><Icon name="arrow-up" size={11}/> Op +5s</button>
          <button
            className="btn xs danger"
            onClick={() => askConfirm({
              title: "Delete steps?",
              body: `Remove ${multiSelect.size} selected step(s)? Dependencies are updated automatically.`,
              danger: true,
              confirmLabel: "Delete",
              onConfirm: () => { removeSteps(selectedArr); setMultiSelect(new Set()); },
            })}
          ><Icon name="trash" size={11}/> Delete</button>
          <button className="btn xs" onClick={() => setMultiSelect(new Set())}>Clear</button>
        </div>
      )}

      <div className="ribbon">
        <span className="chip"><b>CT</b> {schedule.totalCycleTime}s</span>
        <span className="chip" style={{ background: "var(--blue-50)", borderColor: "rgba(30,64,175,.25)" }}><b>Machine</b> {schedule.sumMachine}s</span>
        <span className="chip" style={{ background: "var(--cyan-50)", borderColor: "rgba(6,182,212,.25)" }}><b>Operator</b> {schedule.sumOp}s</span>
        <span className="chip" style={{ background: "var(--violet-50)", borderColor: "rgba(109,40,217,.25)" }}><b>Setup</b> {schedule.sumSetup}s</span>
        <span className="chip" style={{ background: "var(--green-50)", borderColor: "rgba(34,197,94,.25)" }}><b>VA</b> {schedule.vaPct}%</span>
        <span className="chip" style={{ marginLeft: "auto", background: "var(--red-50)", borderColor: "rgba(225,29,46,.25)" }}>
          <b style={{ color: "var(--red)" }}>B/N</b> {schedule.bottleneck?.name || "—"}
        </span>
      </div>

      <div
        className="builder"
        style={{
          "--step-list-max-h": `${builderStepListHeightPx}px`,
          "--builder-gantt-max-h": `${Math.min(560, Math.max(220, builderStepListHeightPx + 120))}px`,
        }}
      >
        {/* LEFT — step list */}
        <div className="card builder-steps-card">
          <div className="card-head">
            <h3>Steps <span className="mono muted" style={{ marginLeft: 6, fontSize: 10 }}>{steps.length}</span></h3>
            <span className="sub">DRAG · SHIFT-CLICK</span>
          </div>
          <div className="step-list-height-row">
            <span className="mono" style={{ whiteSpace: "nowrap" }}>List height</span>
            <input
              type="range"
              min={160}
              max={520}
              step={10}
              value={builderStepListHeightPx}
              onChange={(e) => setBuilderStepListHeightPx(e.target.value)}
              aria-label="Step list panel height"
            />
            <span className="mono muted" style={{ minWidth: 44, textAlign: "right" }}>{builderStepListHeightPx}px</span>
          </div>
          <div className="step-list no-select" onDragOver={(e) => e.preventDefault()}>
            {schedule.steps.map((s, i) => (
              <div
                key={s.id}
                className={`step-card ${selectedId === s.id || multiSelect.has(s.id) ? "selected" : ""} ${s.bottleneck ? "bottleneck" : ""} ${s.groupId ? "group" : ""} ${dragId === s.id ? "dragging" : ""} ${overId === s.id ? "drop-target" : ""}`}
                draggable
                onDragStart={(e) => onDragStart(s.id, e)}
                onDragEnter={() => onDragEnter(s.id)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onClick={(e) => toggleMulti(s.id, e)}
              >
                <div className="step-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="grip" size={14} style={{ color: "var(--ink-4)", cursor: "grab" }}/>
                    <span className="step-idx">{String(i + 1).padStart(2, "0")}</span>
                    <input
                      className="input name"
                      style={{ border: "1px solid transparent", padding: "2px 4px", fontWeight: 600, background: "transparent" }}
                      value={s.name}
                      onChange={(e) => updateStep(s.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {s.groupId && <span className="group-badge">‖ {s.groupId.slice(0, 6)}</span>}
                    {s.wasteType && <span className="tag amber" title={`Waste tag: ${s.wasteType}`}>{s.wasteType.toUpperCase()}</span>}
                    {s.bottleneck && <span className="tag red">B/N</span>}
                    {!s.bottleneck && s.critical && <span className="tag blue">CRIT</span>}
                    <button className="icon-btn" style={{ width: 22, height: 22 }} title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateStep(s.id); }}><Icon name="copy" size={11}/></button>
                    <button
                      className="icon-btn"
                      style={{ width: 22, height: 22 }}
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        askConfirm({
                          title: "Remove step?",
                          body: `Delete "${s.name}"? Dependencies on this step are cleared automatically.`,
                          danger: true,
                          confirmLabel: "Remove",
                          onConfirm: () => removeStep(s.id),
                        });
                      }}
                    ><Icon name="trash" size={11}/></button>
                  </div>
                </div>
                <div className="step-meta">
                  <div className="m machine">
                    <div className="k">MACH</div>
                    <input className="input num" style={inlineNumStyle("var(--blue)")} type="number" value={s.machineTime} min={0} onChange={(e) => updateStep(s.id, { machineTime: Math.max(0, Number(e.target.value) || 0) })} onClick={(e) => e.stopPropagation()}/>
                  </div>
                  <div className="m op">
                    <div className="k">OP</div>
                    <input className="input num" style={inlineNumStyle("#0A8CA3")} type="number" value={s.operatorTime} min={0} onChange={(e) => updateStep(s.id, { operatorTime: Math.max(0, Number(e.target.value) || 0) })} onClick={(e) => e.stopPropagation()}/>
                  </div>
                  <div className="m setup">
                    <div className="k">SET</div>
                    <input className="input num" style={inlineNumStyle("var(--violet)")} type="number" value={s.setupTime} min={0} onChange={(e) => updateStep(s.id, { setupTime: Math.max(0, Number(e.target.value) || 0) })} onClick={(e) => e.stopPropagation()}/>
                  </div>
                </div>
                <div className="step-deps">
                  <span style={{ color: "var(--ink-4)" }}>DEPS</span>
                  {s.dependencies.length === 0
                    ? <span style={{ color: "var(--ink-4)" }}>—</span>
                    : s.dependencies.map(d => <span key={d} className="tag" style={{ fontSize: 9 }}>{(stepById[d]?.name || d).slice(0, 12)}</span>)
                  }
                  {s.stationId && <span className="tag cyan" style={{ fontSize: 9, marginLeft: "auto" }}>{s.stationId}</span>}
                </div>
              </div>
            ))}
            <button className="btn sm" style={{ margin: "4px 2px 0" }} onClick={() => addStep()}>
              <Icon name="plus" size={12}/> Add step
            </button>
          </div>
        </div>

        {/* CENTER — Live Gantt */}
        <div className="card flex-col builder-gantt-card">
          <div className="card-head">
            <h3>Live Gantt</h3>
            <div className="legend">
              <span className="item"><span className="swatch" style={{ background: "var(--violet)" }}/>Setup</span>
              <span className="item"><span className="swatch" style={{ background: "var(--blue)" }}/>Machine</span>
              <span className="item"><span className="swatch" style={{ background: "var(--cyan)" }}/>Operator</span>
              <span className="item"><span className="swatch" style={{ background: "repeating-linear-gradient(45deg, #FCA5A5 0 4px, #F87171 4px 8px)" }}/>Wait</span>
            </div>
          </div>
          <div className="card-body tight">
            <Gantt
              steps={schedule.steps}
              totalCT={schedule.totalCycleTime}
              takt={taktTime}
              tickEvery={40}
              labelWidth={150}
              compact
              showDeps
              highlightCritical={highlightCriticalPath}
              virtualize
              virtualMaxRows={28}
              fillParent
              onStepClick={(s) => setSelectedId(s.id)}
            />
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
            <Icon name="clock" size={13}/> Real-time schedule · dependency lines stay on top when scrolling long lines.
          </div>
        </div>

        {/* RIGHT — Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sel && (
            <>
              <div className="card">
                <div className="card-head"><h3>Step Inspector</h3><span className="sub">{String(schedule.steps.findIndex(s => s.id === sel.id) + 1).padStart(2, "0")}</span></div>
                <div className="card-body" style={{ display: "grid", gap: 10 }}>
                  <input className="input" style={{ fontWeight: 600, fontSize: 13 }} value={sel.name} onChange={(e) => updateStep(sel.id, { name: e.target.value })}/>
                  {[
                    { k: "machineTime", label: "Machine time", max: 200, color: "var(--blue)" },
                    { k: "operatorTime", label: "Operator time", max: 120, color: "var(--cyan)" },
                    { k: "setupTime", label: "Setup time", max: 60, color: "var(--violet)" },
                    { k: "transferTime", label: "Transfer time", max: 30, color: "var(--ink-3)" },
                  ].map(f => (
                    <div key={f.k} className="slider-row" style={{ padding: "6px 0" }}>
                      <div className="k">{f.label}<small>max {f.max}s</small></div>
                      <input type="range" min={0} max={f.max} value={sel[f.k] || 0} onChange={(e) => updateStep(sel.id, { [f.k]: Number(e.target.value) })} style={{ accentColor: f.color }}/>
                      <div className="v" style={{ color: f.color }}>{sel[f.k] || 0}s</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label className="k" style={{ fontSize: 11 }}>Station
                      <input className="input" style={{ width: "100%" }} value={sel.stationId || ""} onChange={(e) => updateStep(sel.id, { stationId: e.target.value })}/>
                    </label>
                    <label className="k" style={{ fontSize: 11 }}>Variability %
                      <input className="input num" style={{ width: "100%" }} type="number" value={sel.variability || 0} onChange={(e) => updateStep(sel.id, { variability: Number(e.target.value) || 0 })}/>
                    </label>
                  </div>

                  <label style={{ fontSize: 11, display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={sel.isValueAdded !== false} onChange={(e) => updateStep(sel.id, { isValueAdded: e.target.checked })}/>
                    <span>
                      Value-added (VA)
                      <span className="muted" style={{ display: "block", fontWeight: 400, marginTop: 4, lineHeight: 1.35 }}>
                        Uncheck to mark this step as <b>non-value-added</b> for VA/NVA % and line efficiency. It does not remove machine/operator/setup time from the schedule — it changes how work is classified in KPIs and reports.
                      </span>
                    </span>
                  </label>

                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>Waste classification (Lean)</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["", "muda", "mura", "muri"].map(w => (
                      <button
                        key={w || "none"}
                        className={`btn xs ${sel.wasteType === (w || null) ? "accent" : ""}`}
                        onClick={() => updateStep(sel.id, { wasteType: w || null })}
                        style={{ flex: 1 }}
                      >{w ? w.toUpperCase() : "CLEAR"}</button>
                    ))}
                  </div>

                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Notes</div>
                  <textarea
                    className="input allow-select"
                    style={{ minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                    value={(steps.find((x) => x.id === sel.id)?.notes ?? sel.notes) || ""}
                    onChange={(e) => updateStep(sel.id, { notes: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Engineering notes, constraints, or observations…"
                  />

                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Dependencies</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {schedule.steps.filter(s2 => s2.id !== sel.id).map(s2 => {
                      const selected = (sel.dependencies || []).includes(s2.id);
                      return (
                        <span
                          key={s2.id}
                          className={`dep-chip ${selected ? "selected" : ""}`}
                          onClick={() => {
                            const next = selected ? sel.dependencies.filter(d => d !== s2.id) : [...sel.dependencies, s2.id];
                            setDependencies(sel.id, next);
                          }}
                        >
                          {s2.name.slice(0, 12)}
                        </span>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Total step</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600 }}>{sel.cycleTime}<span style={{ color: "var(--ink-4)", fontSize: 14 }}>s</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>Smart Suggestions</h3><span className="sub">AI</span></div>
                <div className="card-body" style={{ display: "grid", gap: 6 }}>
                  {suggestNextSteps(sel).slice(0, 4).map((sg, i) => (
                    <div key={i} className="suggestion">
                      <div className="ic"><Icon name="zap" size={14}/></div>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{sg.type}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{sg.reason}</div>
                      </div>
                      <button className="btn sm" onClick={() => onAddSuggested(sg.type.split(" ")[0])}>Add</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="card">
            <div className="card-head"><h3>Wait &amp; Slack</h3><span className="sub">vs critical path</span></div>
            <div className="card-body">
              {schedule.steps.slice(0, 6).map(s => {
                const slack = s.critical ? 0 : Math.max(0, schedule.totalCycleTime - s.endTime);
                return (
                  <HBar key={s.id} label={s.name.split(" ").slice(0, 2).join(" ")} value={slack} max={Math.max(40, schedule.totalCycleTime / 4)} color={slack === 0 ? "var(--red)" : "var(--cyan)"}/>
                );
              })}
            </div>
          </div>

          {schedule.bottleneck && (
            <div className="card" style={{ borderColor: "rgba(225,29,46,.3)" }}>
              <div className="card-head">
                <h3 style={{ color: "var(--red)" }}>Bottleneck Alert</h3>
                <span className="tag red">ACTIVE</span>
              </div>
              <div className="card-body" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                <b style={{ color: "var(--red)" }}>{schedule.bottleneck?.name}</b> is {((schedule.bottleneck.cycleTime / Math.max(1, schedule.totalCycleTime)) * 100).toFixed(0)}% of cycle and defines takt limit.
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button className="btn danger sm" onClick={() => setSelectedId(schedule.bottleneck.id)}>Jump to step</button>
                  <button className="btn sm" onClick={() => setPage("sim")}>Simulate</button>
                </div>
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Optimization Insights</h3><span className="sub">{suggestions.length}</span></div>
              <div className="card-body" style={{ display: "grid", gap: 6 }}>
                {suggestions.slice(0, 3).map((sg, i) => (
                  <div key={i} className="suggestion">
                    <div className="ic"><Icon name="zap" size={14}/></div>
                    <div style={{ fontSize: 11.5 }}>{sg.message}</div>
                    <span className="tag green">+{sg.expectedGain?.toFixed?.(1) || "—"}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function inlineNumStyle(color) {
  return {
    border: 0, background: "transparent", padding: 0, color, fontWeight: 600, fontSize: 12, minHeight: "auto", width: "100%",
  };
}
