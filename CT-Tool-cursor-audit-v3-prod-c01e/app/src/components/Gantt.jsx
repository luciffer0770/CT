import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Gantt chart.
 *
 * Layout notes (important for dep-line alignment):
 *  - The row is a CSS grid: `${labelWidth}px 1fr`.
 *  - We pass labelWidth via a CSS variable so CSS + JS use the same value.
 *  - The SVG dependency overlay sits inside `.gantt` which is
 *    `position: relative`; its X coordinates are absolute pixel positions
 *    from the left edge of `.gantt`.
 *  - Y coordinates use the first data row offset = head height + border.
 */
export default function Gantt({
  steps = [],
  totalCT = 0,
  takt = 240,
  tickEvery = 20,
  labelWidth = 140,
  showTakt = true,
  showDeps = false,
  heatmap = false,
  height = 36,
  compact = false,
  onStepClick,
}) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(800);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(el.clientWidth));
    obs.observe(el);
    setW(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const rowH = compact ? 30 : height;
  const HEAD_H = 27;             // .gantt-head height (26 content + 1 border)
  const trackWidth = Math.max(200, w - labelWidth - 2);
  const maxX = Math.max(totalCT, takt) * 1.05 || 1;
  const scale = trackWidth / maxX;

  const ticks = useMemo(() => {
    const arr = [];
    for (let t = 0; t <= maxX; t += tickEvery) {
      arr.push({ t, x: t * scale, major: t % (tickEvery * 2) === 0 });
    }
    return arr;
  }, [maxX, scale, tickEvery]);

  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });

  const totalRows = steps.length;
  const totalH = HEAD_H + totalRows * rowH;

  return (
    <div
      className="gantt"
      ref={wrapRef}
      style={{
        "--tick": `${tickEvery * scale}px`,
        "--label-w": `${labelWidth}px`,
        "--row-h": `${rowH}px`,
      }}
    >
      <div className="gantt-head">
        <div style={{ borderRight: "1px solid var(--border)", padding: "6px 8px" }}>STEP</div>
        <div className="gantt-axis">
          {ticks.map((tk, i) => (
            <div key={i} className={`tick ${tk.major ? "major" : ""}`} style={{ left: tk.x }}>
              {tk.major ? `${tk.t}s` : ""}
            </div>
          ))}
        </div>
      </div>

      {steps.map((s, i) => {
        const delayRatio = (s.cycleTime || 1) === 0 ? 0 : Math.min(1, (s.waitTime || 0) / Math.max(1, s.cycleTime));
        const heatStyle = heatmap
          ? { background: `linear-gradient(90deg, rgba(34,197,94,${1 - delayRatio}) 0%, rgba(225,29,46,${delayRatio}) 100%)` }
          : {};

        const barTop = (rowH - 20) / 2;
        return (
          <div
            key={s.id}
            className={`gantt-row ${s.bottleneck ? "bottleneck" : ""}`}
            style={{ height: rowH }}
            onClick={() => onStepClick && onStepClick(s)}
          >
            <div className="gantt-label" title={s.name}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{s.name}</span>
              {s.groupId && <span className="group-badge" title={`Parallel group ${s.groupId}`}>‖</span>}
              {s.bottleneck && <span className="tag red" style={{ marginLeft: "auto" }}>B/N</span>}
            </div>
            <div className="gantt-track" style={heatStyle}>
              {s.waitTime > 0 && (
                <div
                  className="bar wait"
                  style={{ left: (s.startTime - s.waitTime) * scale, width: s.waitTime * scale, top: barTop, height: 20 }}
                  onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Wait", v: s.waitTime })}
                  onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTip(null)}
                >
                  {s.waitTime * scale > 30 ? `WAIT ${s.waitTime}s` : ""}
                </div>
              )}
              {s.setupTime > 0 && (
                <div
                  className="bar setup"
                  style={{ left: s.startTime * scale, width: s.setupTime * scale, top: barTop, height: 20 }}
                  onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Setup", v: s.setupTime })}
                  onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTip(null)}
                >
                  {s.setupTime * scale > 30 ? `SET ${s.setupTime}s` : ""}
                </div>
              )}
              {s.machineTime > 0 && (
                <div
                  className={`bar machine ${s.bottleneck ? "bottleneck" : ""}`}
                  style={{ left: (s.startTime + s.setupTime) * scale, width: s.machineTime * scale, top: barTop, height: 20 }}
                  onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Machine", v: s.machineTime })}
                  onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTip(null)}
                >
                  {s.machineTime * scale > 30 ? `MACH ${s.machineTime}s` : ""}
                </div>
              )}
              {s.operatorTime > 0 && (
                <div
                  className="bar op"
                  style={{ left: (s.startTime + s.setupTime + s.machineTime) * scale, width: s.operatorTime * scale, top: barTop, height: 20 }}
                  onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Operator", v: s.operatorTime })}
                  onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTip(null)}
                >
                  {s.operatorTime * scale > 30 ? `OP ${s.operatorTime}s` : ""}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Takt line — spans over the entire data area, placed inside track column */}
      {showTakt && totalRows > 0 && (
        <div
          className="takt-line"
          style={{
            left: labelWidth + takt * scale,
            top: 0,
            height: totalH,
            position: "absolute",
          }}
        />
      )}

      {/* SVG overlay for dependency lines — single SVG sized to the
          actual pixel dimensions of `.gantt`, so lines land on the bars. */}
      {showDeps && totalRows > 0 && (
        <DependencyOverlay
          steps={steps}
          byId={byId}
          rowH={rowH}
          headH={HEAD_H}
          labelWidth={labelWidth}
          scale={scale}
          totalW={w}
          totalH={totalH}
        />
      )}

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="ttl">{tip.s.name}</div>
          <div className="row"><span>{tip.kind}</span><span className="v">{tip.v}s</span></div>
          <div className="row"><span>Start / End</span><span className="v">{tip.s.startTime}s → {tip.s.endTime}s</span></div>
          <div className="row"><span>Total step</span><span className="v">{tip.s.cycleTime}s</span></div>
          {tip.s.waitTime > 0 && <div className="row"><span>Wait</span><span className="v" style={{color:'#FCA5A5'}}>{tip.s.waitTime}s</span></div>}
          {tip.s.groupId && <div className="row"><span>Group</span><span className="v">{tip.s.groupId}</span></div>}
          {tip.s.bottleneck && <div className="row"><span style={{color:'#FCA5A5'}}>Bottleneck</span><span className="v" style={{color:'#F87171'}}>On critical path</span></div>}
        </div>
      )}
    </div>
  );
}

function DependencyOverlay({ steps, byId, rowH, headH, labelWidth, scale, totalW, totalH }) {
  const indexById = {};
  steps.forEach((s, i) => { indexById[s.id] = i; });

  const paths = [];
  steps.forEach((s, i) => {
    (s.dependencies || []).forEach(d => {
      const dep = byId[d];
      if (dep == null) return;
      const depIdx = indexById[d];
      if (depIdx == null) return;

      // End of dep bar (after setup+machine+op) in pixel coordinates
      const fromX = labelWidth + dep.endTime * scale;
      const fromY = headH + depIdx * rowH + rowH / 2;
      // Start of current bar
      const toX = labelWidth + s.startTime * scale;
      const toY = headH + i * rowH + rowH / 2;

      // route with a bezier that curves gently; keep the horizontal
      // offset proportional but bounded so tight gaps still render.
      const dx = Math.max(12, Math.min(48, (toX - fromX) / 2));
      const d1 = `M ${fromX},${fromY} C ${fromX + dx},${fromY} ${toX - dx},${toY} ${toX},${toY}`;
      paths.push({ k: `${s.id}-${d}`, d: d1 });
    });
  });

  // SVG is sized in actual pixels — NO viewBox so coordinates map 1:1.
  return (
    <svg
      width={totalW}
      height={totalH}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <defs>
        <marker id="cta-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8A92A6"/>
        </marker>
      </defs>
      {paths.map(p => (
        <path key={p.k} d={p.d} className="dep-line" markerEnd="url(#cta-arr)"/>
      ))}
    </svg>
  );
}
