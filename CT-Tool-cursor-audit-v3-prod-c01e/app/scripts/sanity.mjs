// Sanity-test the calc + analytics engines.
import { computeSchedule, detectCycles } from "../src/engine/calc.js";
import {
  bottleneckContribution, vaNvaRatio, taktGap, stepImpact,
  lineBalance, cycleStats, calculateOEE, suggestOptimization, autoLineBalance,
  whatIfRemove, validateSteps, takt, costPerUnit, kanbanBins, paretoSteps, yamazumiByStation,
} from "../src/engine/analytics.js";
import { DEFAULT_STEPS } from "../src/data/templates.js";

let failures = 0;
function assert(cond, msg) {
  if (!cond) { failures++; console.error("FAIL:", msg); } else { console.log("ok:", msg); }
}

const schedule = computeSchedule(DEFAULT_STEPS, 240);
console.log("totalCT:", schedule.totalCycleTime, "bottleneck:", schedule.bottleneck?.name);
assert(schedule.totalCycleTime > 0, "schedule totalCT > 0");
assert(schedule.bottleneck && schedule.bottleneck.name.includes("Robotic"), "Robotic Fastening is bottleneck (expected with default steps)");
assert(schedule.criticalSet.size > 0, "critical set non-empty");
assert(schedule.steps.every(s => s.endTime >= s.startTime), "endTime >= startTime everywhere");

// deps propagate
const byId = Object.fromEntries(schedule.steps.map(s => [s.id, s]));
schedule.steps.forEach(s => {
  (s.dependencies || []).forEach(d => {
    assert(byId[d].endTime <= s.endTime, `${s.name} ends after dep ${byId[d].name}`);
  });
});

// Parallel group — pack the 2 middle steps
const parallelSteps = DEFAULT_STEPS.map(s => (s.id === "s2" || s.id === "s3") ? { ...s, groupId: "g1" } : s);
const par = computeSchedule(parallelSteps, 240);
assert(par.totalCycleTime <= schedule.totalCycleTime, "parallel group reduces / equals total CT");
assert(par.steps.find(x => x.id === "s2").startTime === par.steps.find(x => x.id === "s3").startTime, "s2 & s3 share start in group");

// Cycle detection
const cyc = [
  { id: "a", name: "A", machineTime: 1, operatorTime: 0, setupTime: 0, dependencies: ["b"] },
  { id: "b", name: "B", machineTime: 1, operatorTime: 0, setupTime: 0, dependencies: ["a"] },
];
const off = detectCycles(cyc);
assert(off.length > 0, "cycle offenders detected");
const fixed = computeSchedule(cyc, 100);
assert(Number.isFinite(fixed.totalCycleTime), "cyclic input doesn't blow up");

// Analytics
const va = vaNvaRatio(schedule);
assert(va.vaPct + va.nvaPct <= 100.1 && va.vaPct + va.nvaPct >= 99.9, "VA + NVA ≈ 100%");
const imp = stepImpact(DEFAULT_STEPS, 240, "s4", 10);
assert(imp.savingsSec >= 0, "reducing bottleneck by 10s saves >= 0");
const oee = calculateOEE({ availability: 90, performance: 92, quality: 99 });
assert(oee.oee > 0 && oee.oee < 100, "OEE in sane range");
const sug = suggestOptimization(DEFAULT_STEPS, 240);
assert(sug.length > 0, "optimization suggestions produced");
const balance = autoLineBalance(DEFAULT_STEPS, 3);
assert(balance.length === 3, "auto line balance produces 3 stations");
const removeSim = whatIfRemove(DEFAULT_STEPS, 240, "s10");
assert(removeSim.steps.length === DEFAULT_STEPS.length - 1, "what-if remove shortens list");
const warnings = validateSteps(DEFAULT_STEPS);
assert(Array.isArray(warnings), "validateSteps returns array");

// v2 additions
assert(takt(420, 100) === 252, "takt(420min, 100u) = 252s");
const c = costPerUnit(DEFAULT_STEPS, { laborRate: 40, machineRate: 80 });
assert(c.total > 0, "costPerUnit produces positive total");
const kb = kanbanBins({ demandPerMin: 2, leadTimeMin: 30, containerSize: 10, safetyPct: 20 });
assert(kb.bins === 8, `kanban bins: expected 8, got ${kb.bins}`);
const paretoRes = paretoSteps(DEFAULT_STEPS);
assert(paretoRes.length === DEFAULT_STEPS.length && paretoRes[0].cumPct <= 100, "pareto valid");
const yama = yamazumiByStation(DEFAULT_STEPS);
assert(Array.isArray(yama) && yama.length > 0, "yamazumi groups by station");

console.log("\nFailures:", failures);
process.exit(failures > 0 ? 1 : 0);
