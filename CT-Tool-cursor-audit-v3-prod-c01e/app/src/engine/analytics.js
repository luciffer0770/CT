// Analytics engine — derives insights from computed schedule
import { computeSchedule } from "./calc.js";

export function bottleneckContribution(schedule) {
  const total = schedule.totalCycleTime || 1;
  return schedule.steps
    .filter(s => s.critical)
    .map(s => ({ id: s.id, name: s.name, pct: (s.cycleTime / total) * 100, cycle: s.cycleTime }))
    .sort((a, b) => b.pct - a.pct);
}

export function vaNvaRatio(schedule) {
  const { sumVA, sumNVA } = schedule;
  const total = sumVA + sumNVA;
  return { va: sumVA, nva: sumNVA, vaPct: total === 0 ? 0 : (sumVA / total) * 100, nvaPct: total === 0 ? 0 : (sumNVA / total) * 100 };
}

export function taktGap(schedule) {
  return {
    gap: schedule.takt - schedule.totalCycleTime,
    overTakt: schedule.totalCycleTime > schedule.takt,
  };
}

// If step reduced by N seconds, how much does total cycle time change?
export function stepImpact(steps, takt, stepId, deltaSec = 1) {
  const baseline = computeSchedule(steps, takt);
  const mutated = steps.map(s => {
    if (s.id !== stepId) return s;
    // apply to machineTime first (most impactful)
    const m = Math.max(0, (Number(s.machineTime) || 0) - deltaSec);
    return { ...s, machineTime: m };
  });
  const after = computeSchedule(mutated, takt);
  return {
    before: baseline.totalCycleTime,
    after: after.totalCycleTime,
    savingsSec: baseline.totalCycleTime - after.totalCycleTime,
    savingsPct: baseline.totalCycleTime === 0 ? 0 : ((baseline.totalCycleTime - after.totalCycleTime) / baseline.totalCycleTime) * 100,
  };
}

// Line balancing — station load distribution
export function lineBalance(steps) {
  const load = {};
  steps.forEach(s => {
    const st = s.stationId || "ST-1";
    load[st] = (load[st] || 0) + (Number(s.machineTime) || 0) + (Number(s.operatorTime) || 0) + (Number(s.setupTime) || 0);
  });
  const vals = Object.values(load);
  const max = vals.length ? Math.max(...vals) : 0;
  const min = vals.length ? Math.min(...vals) : 0;
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const balance = max === 0 ? 100 : Math.round((avg / max) * 100);
  return { load, max, min, avg, balanceScore: balance };
}

/** Stations where total work time exceeds takt (rough overload indicator) */
export function stationOverloadVsTakt(steps, taktSec) {
  const lb = lineBalance(steps);
  const t = Math.max(1, Number(taktSec) || 1);
  return Object.entries(lb.load).map(([station, sec]) => ({
    station,
    loadSec: sec,
    overBy: sec - t,
    overloaded: sec > t,
  })).sort((a, b) => b.loadSec - a.loadSec);
}

// Stats on cycle times
export function cycleStats(steps) {
  const vals = steps.map(s => (Number(s.machineTime) || 0) + (Number(s.operatorTime) || 0) + (Number(s.setupTime) || 0));
  if (!vals.length) return { min: 0, max: 0, avg: 0, std: 0 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - avg) ** 2, 0) / vals.length);
  return { min, max, avg, std };
}

// OEE = Availability × Performance × Quality
export function calculateOEE({ availability = 90, performance = 92, quality = 99 } = {}) {
  const a = availability / 100, p = performance / 100, q = quality / 100;
  return {
    availability, performance, quality,
    oee: Math.round(a * p * q * 100 * 10) / 10,
  };
}

// Variation per step
export function variationAnalysis(steps) {
  return steps.map(s => {
    const base = (Number(s.machineTime) || 0) + (Number(s.operatorTime) || 0) + (Number(s.setupTime) || 0);
    const v = Number(s.variability) || 0;
    return {
      id: s.id, name: s.name,
      mean: base,
      min: Math.max(0, Math.round(base * (1 - v / 100))),
      max: Math.round(base * (1 + v / 100)),
      std: Math.round(base * (v / 100) / 3),
    };
  });
}

// Auto-suggest optimization — ranked by estimated ROI (cycle impact vs effort proxy)
export function suggestOptimization(steps, takt) {
  const schedule = computeSchedule(steps, takt);
  const suggestions = [];
  const bn = schedule.bottleneck;
  const gap = schedule.totalCycleTime - takt;
  if (bn) {
    const pct = 10;
    const reduced = steps.map(s => s.id === bn.id ? { ...s, machineTime: Math.max(0, s.machineTime * (1 - pct / 100)) } : s);
    const after = computeSchedule(reduced, takt);
    const gain = schedule.totalCycleTime - after.totalCycleTime;
    const why = bn.critical
      ? "Largest cycle-time step on the computed critical path — limits total output."
      : "Longest-duration critical step in the current model.";
    const roi = gain > 0 ? gain / Math.max(1, (bn.machineTime || 0) * (pct / 100)) : 0;
    suggestions.push({
      step: bn,
      kind: "reduce-machine",
      reduction: pct,
      expectedGain: gain,
      priority: 1,
      roi,
      rootCause: why,
      message: `[Priority 1] ${bn.name}: ${why} Reducing machine time ${pct}% → about −${gain.toFixed(1)}s cycle (effort proxy ROI ${roi.toFixed(2)}).`,
    });
    if (gap > 0) {
      suggestions.push({
        kind: "takt-gap",
        priority: 2,
        message: `Line is ${gap.toFixed(0)}s over takt — focus on "${bn.name}" first, then rebalance stations or reduce non-value-added time.`,
      });
    }
  }
  // suggest parallel candidates: any two sibling steps with no mutual dependency
  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });
  const candidates = [];
  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i], b = steps[j];
      if ((a.dependencies || []).includes(b.id) || (b.dependencies || []).includes(a.id)) continue;
      if (a.groupId && a.groupId === b.groupId) continue;
      // share at least one dependency → good candidate
      const share = (a.dependencies || []).some(d => (b.dependencies || []).includes(d));
      if (share) {
        candidates.push({ a, b, saves: Math.min(a.cycleTime || 0, b.cycleTime || 0) });
      }
    }
  }
  candidates.sort((x, y) => y.saves - x.saves);
  if (candidates[0]) {
    const c = candidates[0];
    suggestions.push({
      kind: "parallelize",
      pair: [c.a, c.b],
      expectedGain: c.saves,
      priority: 3,
      rootCause: "No hard dependency between these steps but both wait on upstream work — parallel may shorten the path.",
      message: `[Parallel] "${c.a.name}" & "${c.b.name}" — potential ~${Math.round(c.saves)}s if grouped (verify tooling / space).`,
    });
  }

  // Suggest removing zero-value setup heavy
  const heavySetup = steps.filter(s => (s.setupTime || 0) > (s.machineTime + s.operatorTime) / 2);
  heavySetup.forEach(s => {
    suggestions.push({
      kind: "smed",
      step: s,
      expectedGain: s.setupTime * 0.5,
      priority: 4,
      rootCause: "Setup dominates step time — classic SMED / quick-change candidate.",
      message: `SMED on "${s.name}" — setup ${s.setupTime}s > 50% of step work; target about −${Math.round(s.setupTime * 0.5)}s.`,
    });
  });

  return suggestions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

// Suggest next steps (smart suggestions)
export function suggestNextSteps(step) {
  const list = [];
  if ((step.machineTime || 0) >= 40) {
    list.push({ type: "cooling", reason: "High machine time", defaults: { machineTime: 10, operatorTime: 0, setupTime: 0 } });
  }
  if ((step.operatorTime || 0) >= 25) {
    list.push({ type: "automation", reason: "High operator time", defaults: { machineTime: 12, operatorTime: 3, setupTime: 2 } });
  }
  list.push({ type: "inspection", reason: "Standard quality gate", defaults: { machineTime: 4, operatorTime: 6, setupTime: 1 } });
  list.push({ type: "transfer", reason: "Move to next station", defaults: { machineTime: 0, operatorTime: 2, setupTime: 0, transferTime: 4 } });
  list.push({ type: "quality check", reason: "Visual / torque / dimensional", defaults: { machineTime: 2, operatorTime: 8, setupTime: 1 } });
  return list;
}

// Validation
export function validateSteps(steps) {
  const warnings = [];
  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });
  steps.forEach(s => {
    if ((s.machineTime || 0) < 0 || (s.operatorTime || 0) < 0 || (s.setupTime || 0) < 0) {
      warnings.push({ id: s.id, level: "error", msg: `${s.name}: negative time values` });
    }
    if ((s.machineTime || 0) + (s.operatorTime || 0) + (s.setupTime || 0) === 0) {
      warnings.push({ id: s.id, level: "warn", msg: `${s.name}: zero total duration` });
    }
    if ((s.machineTime || 0) > 500 || (s.operatorTime || 0) > 500) {
      warnings.push({ id: s.id, level: "warn", msg: `${s.name}: unrealistically large time (>500s)` });
    }
    (s.dependencies || []).forEach(d => {
      if (!byId[d]) warnings.push({ id: s.id, level: "warn", msg: `${s.name}: unknown dependency "${d}"` });
    });
  });
  // Circular dependencies (DFS on raw graph)
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  steps.forEach(s => color[s.id] = WHITE);
  const visit = (id, path) => {
    color[id] = GRAY;
    const s = byId[id];
    if (!s) return false;
    for (const d of s.dependencies || []) {
      if (color[d] === GRAY) {
        warnings.push({ id: s.id, level: "error", msg: `Circular dependency: ${s.name} → ${byId[d]?.name || d}` });
        return true;
      }
      if (color[d] === WHITE && visit(d, path.concat(id))) return true;
    }
    color[id] = BLACK;
    return false;
  };
  steps.forEach(s => { if (color[s.id] === WHITE) visit(s.id, []); });
  return warnings;
}

// Auto line balancing — redistribute steps into N stations balancing load
export function autoLineBalance(steps, stationCount = 3) {
  const sorted = [...steps].sort((a, b) => {
    const ca = (a.machineTime || 0) + (a.operatorTime || 0) + (a.setupTime || 0);
    const cb = (b.machineTime || 0) + (b.operatorTime || 0) + (b.setupTime || 0);
    return cb - ca;
  });
  const stations = Array.from({ length: stationCount }, (_, i) => ({ id: `ST-${i + 1}`, total: 0, steps: [] }));
  sorted.forEach(s => {
    stations.sort((a, b) => a.total - b.total);
    stations[0].steps.push(s.id);
    const ct = (s.machineTime || 0) + (s.operatorTime || 0) + (s.setupTime || 0);
    stations[0].total += ct;
  });
  return stations.sort((a, b) => a.id.localeCompare(b.id));
}

// "What-if remove step" — returns schedule without step
export function whatIfRemove(steps, takt, stepId) {
  const without = steps
    .filter(s => s.id !== stepId)
    .map(s => ({ ...s, dependencies: (s.dependencies || []).filter(d => d !== stepId) }));
  return computeSchedule(without, takt);
}

// -------- v2 additions ---------

// Takt time = available production time / customer demand
export function takt(availableTimeMin, demand) {
  if (!demand || demand <= 0) return 0;
  return Math.round((availableTimeMin * 60) / demand); // seconds
}

// Cost per unit = (labor * sumOperator / 3600) + (machine * sumMachine / 3600) + setup amortised
export function costPerUnit(steps, { laborRate = 35, machineRate = 80 } = {}) {
  const sumMachine = steps.reduce((a, s) => a + (Number(s.machineTime) || 0), 0);
  const sumOp      = steps.reduce((a, s) => a + (Number(s.operatorTime) || 0), 0);
  const sumSetup   = steps.reduce((a, s) => a + (Number(s.setupTime) || 0), 0);
  const labor   = (laborRate / 3600) * (sumOp + sumSetup);
  const machine = (machineRate / 3600) * (sumMachine + sumSetup);
  return {
    labor: +labor.toFixed(4),
    machine: +machine.toFixed(4),
    total: +(labor + machine).toFixed(4),
    perHour: {
      labor: +((laborRate / 3600) * (sumOp + sumSetup) * 3600 / Math.max(1, sumMachine+sumOp+sumSetup)).toFixed(2),
    },
  };
}

// Kanban bin count: demand × lead time × (1 + safety) / container size
export function kanbanBins({ demandPerMin, leadTimeMin, containerSize = 10, safetyPct = 20 }) {
  const d = Number(demandPerMin) || 0;
  const lt = Number(leadTimeMin) || 0;
  const cs = Math.max(1, Number(containerSize) || 1);
  const safety = 1 + (Number(safetyPct) || 0) / 100;
  const bins = Math.ceil((d * lt * safety) / cs);
  return { bins, demandPerMin: d, leadTimeMin: lt, containerSize: cs, safetyPct };
}

// Pareto (80/20) of step cycle times
export function paretoSteps(steps) {
  const arr = [...steps]
    .map(s => ({ id: s.id, name: s.name, value: (Number(s.machineTime)||0)+(Number(s.operatorTime)||0)+(Number(s.setupTime)||0) }))
    .sort((a,b) => b.value - a.value);
  const total = arr.reduce((a,b) => a + b.value, 0) || 1;
  let cum = 0;
  return arr.map(x => { cum += x.value; return { ...x, cumPct: (cum/total)*100 }; });
}

// Yamazumi stack by station
export function yamazumiByStation(steps) {
  const stations = {};
  steps.forEach(s => {
    const st = s.stationId || "UNASSIGNED";
    if (!stations[st]) stations[st] = { id: st, segments: [], total: 0 };
    const cyc = (Number(s.machineTime)||0)+(Number(s.operatorTime)||0)+(Number(s.setupTime)||0);
    stations[st].segments.push({ id: s.id, name: s.name, cyc,
      machine: Number(s.machineTime)||0, operator: Number(s.operatorTime)||0, setup: Number(s.setupTime)||0,
      isValueAdded: s.isValueAdded !== false,
    });
    stations[st].total += cyc;
  });
  return Object.values(stations).sort((a,b) => a.id.localeCompare(b.id));
}

// Spaghetti / 5W+1H waste matrix
export function wasteTally(steps) {
  const t = { muda: 0, mura: 0, muri: 0 };
  steps.forEach(s => { if (s.wasteType && t[s.wasteType] !== undefined) t[s.wasteType]++; });
  return t;
}
