
// Simple layered DAG layout:
// - rank by longest-path depth from roots
// - position by rank (x) and order within rank (y)
export default function ProcessFlow({ schedule, onStepClick, height = 380 }) {
  const steps = schedule.steps;
  if (!steps.length) return <div className="muted" style={{ padding: 20, textAlign: "center" }}>No steps</div>;
  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });

  // compute longest-path rank
  const rank = {};
  const visit = (id) => {
    if (rank[id] !== undefined) return rank[id];
    const s = byId[id];
    const deps = (s.dependencies || []).filter(d => byId[d]);
    if (!deps.length) { rank[id] = 0; return 0; }
    const r = Math.max(...deps.map(d => visit(d) + 1));
    rank[id] = r;
    return r;
  };
  steps.forEach(s => visit(s.id));

  // layout
  const ranks = {};
  Object.entries(rank).forEach(([id, r]) => {
    if (!ranks[r]) ranks[r] = [];
    ranks[r].push(id);
  });

  const maxRank = Math.max(...Object.keys(ranks).map(Number));
  const nodeW = 130, nodeH = 44;
  const gapX = 70, gapY = 18;
  const maxPerRank = Math.max(...Object.values(ranks).map(arr => arr.length));
  const canvasW = (maxRank + 1) * (nodeW + gapX) + gapX;
  const canvasH = Math.max(height, maxPerRank * (nodeH + gapY) + gapY * 2);

  const positions = {};
  Object.entries(ranks).forEach(([r, ids]) => {
    const startY = (canvasH - ids.length * (nodeH + gapY)) / 2 + gapY;
    ids.forEach((id, i) => {
      positions[id] = {
        x: gapX + Number(r) * (nodeW + gapX),
        y: startY + i * (nodeH + gapY),
      };
    });
  });

  const edges = [];
  steps.forEach(s => {
    (s.dependencies || []).forEach(d => {
      if (!byId[d]) return;
      const from = positions[d];
      const to = positions[s.id];
      const critical = byId[d].critical && s.critical;
      edges.push({ key: `${d}-${s.id}`, from, to, critical });
    });
  });

  return (
    <svg width="100%" height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="xMidYMid meet">
      {edges.map(e => {
        const x1 = e.from.x + nodeW, y1 = e.from.y + nodeH / 2;
        const x2 = e.to.x, y2 = e.to.y + nodeH / 2;
        const mid = (x1 + x2) / 2;
        const d = `M ${x1},${y1} C ${mid},${y1} ${mid},${y2} ${x2},${y2}`;
        return <path key={e.key} d={d} className={`flow-edge ${e.critical ? "critical" : ""}`}/>;
      })}
      {steps.map(s => {
        const p = positions[s.id];
        if (!p) return null;
        return (
          <g key={s.id} onClick={() => onStepClick && onStepClick(s)} style={{ cursor: "pointer" }}>
            <rect
              x={p.x} y={p.y} width={nodeW} height={nodeH} rx="5"
              className={`flow-node ${s.bottleneck ? "bottleneck" : ""} ${s.critical ? "critical" : ""}`}
            />
            <text x={p.x + 8} y={p.y + 16} className="flow-label" style={{ fontWeight: 600, fontSize: 11 }}>
              {s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name}
            </text>
            <text x={p.x + 8} y={p.y + 32} className="flow-label" style={{ fontSize: 10, fill: s.bottleneck ? "#E11D2E" : "#5B6274" }}>
              {s.cycleTime}s
              {s.groupId ? " · ‖" : ""}
              {s.stationId ? ` · ${s.stationId}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
