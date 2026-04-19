import { paretoSteps } from "../engine/analytics.js";

export default function Pareto({ steps, height = 240 }) {
  const data = paretoSteps(steps);
  if (!data.length) return <div className="muted" style={{ padding: 20, textAlign: "center" }}>No steps</div>;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const bw = 40, gap = 6;
  const chartW = Math.max(600, data.length * (bw + gap) + 60);
  const innerH = height - 40;
  const toY = v => (v / maxV) * innerH;

  // cumulative line points
  const points = data.map((d, i) => {
    const x = 30 + i * (bw + gap) + bw / 2;
    const y = innerH - (d.cumPct / 100) * innerH;
    return [x, y];
  });
  const lineD = points.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${chartW} ${height}`} preserveAspectRatio="xMidYMax meet">
      {/* y-left (value) */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = innerH - f * innerH;
        return (
          <g key={f}>
            <line x1="30" x2={chartW - 20} y1={y} y2={y} stroke="#E2E6EF"/>
            <text x="4" y={y + 3} fontSize="9" fill="#8A92A6">{Math.round(f * maxV)}s</text>
          </g>
        );
      })}
      {/* 80% line */}
      <line x1="30" x2={chartW - 20} y1={innerH - 0.8 * innerH} y2={innerH - 0.8 * innerH} stroke="#22C55E" strokeWidth="1.5" strokeDasharray="4 3"/>
      <text x={chartW - 22} y={innerH - 0.8 * innerH - 3} textAnchor="end" fontSize="10" fill="#22C55E" fontWeight="600">80% threshold</text>

      {data.map((d, i) => {
        const x = 30 + i * (bw + gap);
        const h = toY(d.value);
        const y = innerH - h;
        return (
          <g key={d.id}>
            <rect x={x} y={y} width={bw} height={h} fill={d.cumPct <= 80 ? "#E11D2E" : "#1E40AF"} rx="2">
              <title>{d.name} · {d.value}s · {d.cumPct.toFixed(0)}% cumulative</title>
            </rect>
            <text x={x + bw / 2} y={innerH + 12} textAnchor="middle" fontSize="9" fill="#5B6274">{d.name.split(" ")[0]}</text>
            <text x={x + bw / 2} y={innerH + 25} textAnchor="middle" fontSize="9" fill="#8A92A6">{d.cumPct.toFixed(0)}%</text>
          </g>
        );
      })}
      {/* cumulative line */}
      <path d={lineD} fill="none" stroke="#6D28D9" strokeWidth="2"/>
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#6D28D9"/>)}
    </svg>
  );
}
