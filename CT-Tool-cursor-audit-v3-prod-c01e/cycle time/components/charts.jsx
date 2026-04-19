/* Gantt chart component */
const useRef = (...a) => React.useRef(...a);
const useState = (...a) => React.useState(...a);
const useEffect = (...a) => React.useEffect(...a);
const useMemo = (...a) => React.useMemo(...a);

function Gantt({ steps, totalCT, takt, height = 36, showTakt = true, showDeps = true, tickEvery = 20, labelWidth = 140 }) {
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

  const trackWidth = Math.max(200, w - labelWidth - 16);
  const maxX = Math.max(totalCT, takt) * 1.05;
  const scale = trackWidth / maxX;

  const ticks = [];
  for (let t = 0; t <= maxX; t += tickEvery) {
    ticks.push({ t, x: t * scale, major: t % (tickEvery * 2) === 0 });
  }

  const byId = {};
  steps.forEach(s => byId[s.id] = s);

  return (
    <div className="gantt" ref={wrapRef} style={{ "--tick": `${tickEvery * scale}px` }}>
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

      {steps.map((s, i) => (
        <div key={s.id} className={`gantt-row ${s.bottleneck ? "bottleneck" : ""}`}>
          <div className="gantt-label" title={s.name}>
            <span className="n">{String(i+1).padStart(2,"0")}</span>
            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{s.name}</span>
            {s.bottleneck && <span className="tag red" style={{ marginLeft: "auto" }}>B/N</span>}
          </div>
          <div className="gantt-track">
            {/* Setup */}
            {s.setup > 0 && (
              <div className="bar setup"
                   style={{ left: s.start * scale, width: s.setup * scale }}
                   onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Setup", v: s.setup })}
                   onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                   onMouseLeave={() => setTip(null)}>
                {s.setup * scale > 30 ? `SET ${s.setup}s` : ""}
              </div>
            )}
            {/* Machine */}
            <div className={`bar machine ${s.bottleneck ? "bottleneck" : ""}`}
                 style={{ left: (s.start + s.setup) * scale, width: s.machine * scale }}
                 onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Machine", v: s.machine })}
                 onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                 onMouseLeave={() => setTip(null)}>
              {s.machine * scale > 30 ? `MACH ${s.machine}s` : ""}
            </div>
            {/* Operator */}
            {s.op > 0 && (
              <div className="bar op"
                   style={{ left: (s.start + s.setup + s.machine) * scale, width: s.op * scale }}
                   onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, s, kind: "Operator", v: s.op })}
                   onMouseMove={(e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                   onMouseLeave={() => setTip(null)}>
                {s.op * scale > 30 ? `OP ${s.op}s` : ""}
              </div>
            )}
          </div>
        </div>
      ))}

      {showTakt && (
        <div style={{ position: "relative", height: 0 }}>
          <div className="takt-line" style={{ left: labelWidth + takt * scale, top: -steps.length * height - 26, height: steps.length * height + 26 }} />
        </div>
      )}

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="ttl">{tip.s.name}</div>
          <div className="row"><span>{tip.kind}</span><span className="v">{tip.v}s</span></div>
          <div className="row"><span>Start / End</span><span className="v">{tip.s.start}s → {tip.s.end}s</span></div>
          <div className="row"><span>Total step</span><span className="v">{tip.s.duration}s</span></div>
          {tip.s.bottleneck && <div className="row"><span style={{color:'#FCA5A5'}}>Bottleneck</span><span className="v" style={{color:'#F87171'}}>On critical path</span></div>}
        </div>
      )}
    </div>
  );
}

/* Sparkline (SVG) */
function Spark({ data, color = "#1E40AF", height = 36, width = 120, fill = true }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = Math.max(1, max - min);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i*step},${height - ((v-min)/rng)*(height-4) - 2}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && <polyline points={area} fill={color} opacity="0.08" stroke="none"/>}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* Donut */
function Donut({ parts, size = 140, thickness = 22 }) {
  const total = parts.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EEF1F7" strokeWidth={thickness}/>
      {parts.map((p, i) => {
        const frac = p.value / total;
        const len = c * frac;
        const gap = c - len;
        const off = c * 0.25 - c * acc; // start at top
        acc += frac;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={p.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${gap}`}
            strokeDashoffset={off}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 300ms var(--ease)" }}
          />
        );
      })}
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="18" fontWeight="600" fill="#0B1020">{parts[0].value}%</text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="0.14em" fill="#8A92A6">VALUE-ADDED</text>
    </svg>
  );
}

/* Horizontal bar row */
function HBar({ label, value, max, color, suffix = "s" }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="hbar-row">
      <div className="lbl">{label}</div>
      <div className="track"><div className="fill" style={{ width: `${pct}%`, background: color }}/></div>
      <div className="v">{value}{suffix}</div>
    </div>
  );
}

window.Gantt = Gantt;
window.Spark = Spark;
window.Donut = Donut;
window.HBar = HBar;
