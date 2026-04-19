import { yamazumiByStation } from "../engine/analytics.js";

export default function Yamazumi({ steps, takt, height = 260 }) {
  const stations = yamazumiByStation(steps);
  const maxY = Math.max(takt * 1.1, ...stations.map(s => s.total), 10);
  const colW = 68;
  const gap = 18;
  const chartW = stations.length * (colW + gap) + 40;
  const innerH = height - 40;

  const toY = (v) => (v / maxY) * innerH;

  const taktY = innerH - toY(takt);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${chartW} ${height}`} preserveAspectRatio="xMidYMax meet">
      {/* takt line */}
      <line x1="30" x2={chartW - 10} y1={taktY} y2={taktY} stroke="#E11D2E" strokeWidth="1.5" strokeDasharray="4 3"/>
      <text x={chartW - 14} y={taktY - 4} textAnchor="end" fontSize="10" fill="#E11D2E" fontWeight="600">TAKT {takt}s</text>

      {/* y ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = innerH - f * innerH;
        const v = Math.round(f * maxY);
        return (
          <g key={i}>
            <line x1="30" x2={chartW - 10} y1={y} y2={y} stroke="#E2E6EF"/>
            <text x="4" y={y + 3} fontSize="9" fill="#8A92A6">{v}</text>
          </g>
        );
      })}

      {stations.map((st, i) => {
        const x = 40 + i * (colW + gap);
        let cursorY = innerH;
        return (
          <g key={st.id}>
            {st.segments.map((seg, j) => {
              const h = toY(seg.cyc);
              cursorY -= h;
              const color = !seg.isValueAdded ? "#F59E0B" : (seg.cyc > takt * 0.7 ? "#E11D2E" : j % 2 === 0 ? "#1E40AF" : "#06B6D4");
              return (
                <g key={seg.id}>
                  <rect x={x} y={cursorY} width={colW} height={h} fill={color} stroke="white" strokeWidth="1">
                    <title>{seg.name} · {seg.cyc}s</title>
                  </rect>
                  {h > 14 && <text x={x + colW / 2} y={cursorY + h / 2 + 3} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">{seg.cyc}s</text>}
                </g>
              );
            })}
            <text x={x + colW / 2} y={innerH + 14} textAnchor="middle" fontSize="10" fill="#5B6274" fontWeight="600">{st.id}</text>
            <text x={x + colW / 2} y={innerH + 27} textAnchor="middle" fontSize="10" fill={st.total > takt ? "#E11D2E" : "#0B1020"} fontWeight="700">{st.total}s</text>
          </g>
        );
      })}

      {stations.length === 0 && (
        <text x={chartW / 2} y={height / 2} textAnchor="middle" fill="#8A92A6" fontSize="12">
          Assign stationId to steps in the Cycle Builder to see Yamazumi.
        </text>
      )}
    </svg>
  );
}
