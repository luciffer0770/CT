/* Shared data model for the cycle analyzer */
const DEFAULT_STEPS = [
  { id: "s1", name: "Frame Preparation",   machine: 22, op: 12, setup: 6,  deps: [],        type: "machine" },
  { id: "s2", name: "Weld Station A",      machine: 48, op: 18, setup: 8,  deps: ["s1"],    type: "machine" },
  { id: "s3", name: "Sub-assembly Load",   machine: 12, op: 24, setup: 4,  deps: ["s1"],    type: "op"      },
  { id: "s4", name: "Robotic Fastening",   machine: 86, op: 8,  setup: 10, deps: ["s2","s3"], type: "machine" }, // bottleneck
  { id: "s5", name: "Sensor Mount",        machine: 18, op: 22, setup: 5,  deps: ["s4"],    type: "op"      },
  { id: "s6", name: "Inline QC Vision",    machine: 26, op: 6,  setup: 4,  deps: ["s4"],    type: "machine" },
  { id: "s7", name: "Wiring Harness",      machine: 14, op: 32, setup: 6,  deps: ["s5"],    type: "op"      },
  { id: "s8", name: "Final Torque",        machine: 20, op: 14, setup: 4,  deps: ["s6","s7"], type: "machine" },
  { id: "s9", name: "End-of-Line Test",    machine: 34, op: 10, setup: 3,  deps: ["s8"],    type: "machine" },
  { id: "s10",name: "Pack & Label",        machine: 10, op: 18, setup: 2,  deps: ["s9"],    type: "op"      },
];

// Compute schedule with topological dependencies; returns {byId, totalCT, critical, waitMap}
function computeSchedule(steps, takt) {
  const byId = {};
  steps.forEach(s => byId[s.id] = { ...s, start: 0, end: 0, duration: s.machine + s.op + s.setup });
  // topo order based on deps
  const order = [];
  const visited = {};
  const visit = (id) => {
    if (visited[id]) return;
    visited[id] = true;
    const s = byId[id];
    if (!s) return;
    (s.deps || []).forEach(visit);
    order.push(id);
  };
  steps.forEach(s => visit(s.id));
  let totalEnd = 0;
  order.forEach(id => {
    const s = byId[id];
    const depEnd = (s.deps || []).reduce((m, d) => Math.max(m, byId[d] ? byId[d].end : 0), 0);
    s.start = depEnd;
    s.end = s.start + s.duration;
    totalEnd = Math.max(totalEnd, s.end);
  });
  // Critical path: walk backward from latest
  let criticalSet = new Set();
  const lateEnd = totalEnd;
  // find tail(s) = steps with end == totalEnd
  let tails = Object.values(byId).filter(s => s.end === totalEnd);
  const walk = (s) => {
    if (criticalSet.has(s.id)) return;
    criticalSet.add(s.id);
    const deps = (s.deps || []).map(d => byId[d]).filter(Boolean);
    if (!deps.length) return;
    // pick latest-ending dep
    let best = deps[0];
    deps.forEach(d => { if (d.end > best.end) best = d; });
    walk(best);
  };
  tails.forEach(walk);
  // Waits: for each step, wait = max(dep.end) - step.start.. (always 0 with this calc; we inject operator wait within parallel)
  // Bottleneck = longest step on critical path
  let bottleneck = null;
  criticalSet.forEach(id => {
    const s = byId[id];
    if (!bottleneck || s.duration > bottleneck.duration) bottleneck = s;
  });

  const steps2 = steps.map(s => ({
    ...byId[s.id],
    critical: criticalSet.has(s.id),
    bottleneck: bottleneck && s.id === bottleneck.id,
  }));

  const sumMachine = steps.reduce((a,b)=>a+b.machine,0);
  const sumOp = steps.reduce((a,b)=>a+b.op,0);
  const sumSetup = steps.reduce((a,b)=>a+b.setup,0);
  const effectiveWork = sumMachine + sumOp + sumSetup;
  const totalCT = totalEnd; // critical-path (parallelized)
  const efficiency = Math.min(99.9, (totalCT / Math.max(totalCT, takt)) * 100 * 0.92); // stylized
  const vaPct = Math.round((sumMachine + sumOp) / effectiveWork * 100);
  const nvaPct = 100 - vaPct;

  return {
    steps: steps2,
    totalCT,
    takt,
    efficiency: Math.round((totalCT / takt) * 100),
    bottleneck,
    sumMachine, sumOp, sumSetup,
    vaPct, nvaPct,
  };
}

// Recent activity
const ACTIVITY = [
  { when: "2m",  who: "M. Becker",   act: "Adjusted Robotic Fastening machine time → 86s", tag: "edit" },
  { when: "9m",  who: "J. Ortiz",    act: "Saved version v14 – Shift B calibration",       tag: "save" },
  { when: "22m", who: "A. Novak",    act: "Marked Step 4 as critical",                    tag: "flag" },
  { when: "41m", who: "System",      act: "Simulation #124 completed — Δ -4.8% cycle",     tag: "sim"  },
  { when: "1h",  who: "L. Yamada",   act: "Exported report LINE-07-W16-EOL.pdf",          tag: "exp"  },
  { when: "2h",  who: "M. Becker",   act: "Imported Siemens OPC-UA tag map",               tag: "imp"  },
  { when: "3h",  who: "System",      act: "Takt updated to 240s by Scheduler",             tag: "sys"  },
];

window.DEFAULT_STEPS = DEFAULT_STEPS;
window.computeSchedule = computeSchedule;
window.ACTIVITY = ACTIVITY;
