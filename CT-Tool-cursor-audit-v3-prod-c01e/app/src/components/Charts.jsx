
export function Spark({ data, color = "#1E40AF", height = 36, width = 120, fill = true }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = Math.max(1, max - min);
  const step = width / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / rng) * (height - 4) - 2}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && <polyline points={area} fill={color} opacity="0.08" stroke="none" />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Donut({ parts, size = 140, thickness = 22, centerLabel, centerValue }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const arcs = parts.map((p, i) => {
    const frac = p.value / total;
    const len = c * frac;
    const gap = c - len;
    const off = c * 0.25 - c * acc;
    acc += frac;
    return { p, i, len, gap, off };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F7" strokeWidth={thickness} />
      {arcs.map(({ p, i, len, gap, off }) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={p.color}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${gap}`}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 300ms var(--ease)" }}
        />
      ))}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="18" fontWeight="600" fill="currentColor">{centerValue ?? `${parts[0]?.value ?? 0}%`}</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="0.14em" fill="#8A92A6">{centerLabel || "VALUE-ADDED"}</text>
    </svg>
  );
}

export function HBar({ label, value, max, color = "var(--blue)", suffix = "s", cols = "90px 1fr 64px" }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="hbar-row" style={{ gridTemplateColumns: cols }}>
      <div className="lbl">{label}</div>
      <div className="track"><div className="fill" style={{ width: `${pct}%`, background: color }} /></div>
      <div className="v">{typeof value === "number" ? value.toFixed?.(0) ?? value : value}{suffix}</div>
    </div>
  );
}

// Grouped bar chart (planned vs actual)
export function GroupedBars({ data, max, colors = ["var(--ink-4)", "var(--blue)"] }) {
  // data: [{ label, values: [a,b] }]
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 11.5 }}>{d.label}</div>
          <div style={{ display: "grid", gap: 3 }}>
            {d.values.map((v, j) => (
              <div key={j} style={{ position: "relative", height: 10, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${(v / max) * 100}%`, background: colors[j] || "var(--ink)", height: "100%" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Histogram({ totalCT, takt, samples = 30 }) {
  const bins = [];
  const center = totalCT;
  for (let i = -6; i <= 6; i++) {
    const v = Math.max(0, Math.round(samples * Math.exp(-Math.pow(i, 2) / 8) + (i % 2 === 0 ? 2 : 0)));
    bins.push({ t: center + i * 4, v });
  }
  const max = Math.max(...bins.map(b => b.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180, paddingTop: 12, position: "relative" }}>
      {bins.map((b, i) => {
        const over = b.t > takt;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%",
              height: `${(b.v / max) * 150}px`,
              background: over ? "var(--red)" : "var(--blue)",
              opacity: i === 6 ? 1 : 0.8,
              borderRadius: "2px 2px 0 0",
              transition: "height 300ms var(--ease)",
            }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--ink-4)" }}>{b.t}s</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: `${((takt - bins[0].t) / (bins[bins.length - 1].t - bins[0].t)) * 100}%`, top: 0, bottom: 18, borderLeft: "1.5px dashed var(--red)" }}>
        <span style={{ position: "absolute", top: 0, left: 3, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)", background: "var(--surface)", padding: "0 3px" }}>TAKT {takt}s</span>
      </div>
    </div>
  );
}

// Simple line chart (used for trend over steps)
export function LineChart({ data, height = 160, color = "#1E40AF", yLabel: _yLabel = "" }) {
  const w = 600;
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const rng = Math.max(1, max - min);
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((d, i) => `${i * step},${height - ((d.value - min) / rng) * (height - 20) - 10}`).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      {data.map((d, i) => (
        <circle key={i} cx={i * step} cy={height - ((d.value - min) / rng) * (height - 20) - 10} r="3" fill={color} />
      ))}
    </svg>
  );
}
