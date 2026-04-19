// Cycle time calculation engine
// Supports:
//  - cycleTime = machine + operator + setup
//  - dependencies (DAG)
//  - parallel execution via groupId
//  - critical path identification
//  - wait-time calculation
//  - bottleneck detection

export function cycleTimeOf(step) {
  // External setup is performed during the previous step's cycle (SMED),
  // so it does NOT contribute to the in-line cycle time.
  return (Number(step.machineTime) || 0) + (Number(step.operatorTime) || 0) + (Number(step.setupTime) || 0);
}

// Detect cycles in dependency graph; returns list of offending step ids or []
export function detectCycles(steps) {
  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  steps.forEach(s => color[s.id] = WHITE);
  const offenders = new Set();

  const visit = (id) => {
    if (!byId[id]) return false;
    color[id] = GRAY;
    for (const d of byId[id].dependencies || []) {
      if (!byId[d]) continue;
      if (color[d] === GRAY) { offenders.add(d); offenders.add(id); return true; }
      if (color[d] === WHITE && visit(d)) { offenders.add(id); return true; }
    }
    color[id] = BLACK;
    return false;
  };
  steps.forEach(s => { if (color[s.id] === WHITE) visit(s.id); });
  return Array.from(offenders);
}

// Topological order (Kahn's algorithm)
export function topoOrder(steps) {
  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });
  const indeg = {};
  steps.forEach(s => { indeg[s.id] = 0; });
  steps.forEach(s => (s.dependencies || []).forEach(d => {
    if (byId[d]) indeg[s.id] = (indeg[s.id] || 0) + 1;
  }));
  const q = [];
  steps.forEach(s => { if (indeg[s.id] === 0) q.push(s.id); });
  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    steps.forEach(s => {
      if ((s.dependencies || []).includes(id)) {
        indeg[s.id]--;
        if (indeg[s.id] === 0) q.push(s.id);
      }
    });
  }
  return order;
}

// Core schedule computation
export function computeSchedule(rawSteps, taktTime = 240) {
  if (!rawSteps) rawSteps = [];
  const steps = rawSteps.map(s => ({
    id: s.id,
    name: s.name,
    machineTime: Number(s.machineTime) || 0,
    operatorTime: Number(s.operatorTime) || 0,
    setupTime: Number(s.setupTime) || 0,
    transferTime: Number(s.transferTime) || 0,
    dependencies: Array.isArray(s.dependencies) ? s.dependencies.slice() : [],
    groupId: s.groupId || null,
    isValueAdded: s.isValueAdded !== false,
    stationId: s.stationId || null,
    variability: Number(s.variability) || 0,
    type: s.type || "machine",
  }));

  // cycleTime per step
  steps.forEach(s => { s.cycleTime = cycleTimeOf(s); });

  const byId = {};
  steps.forEach(s => { byId[s.id] = s; });

  // validate + filter invalid deps
  steps.forEach(s => {
    s.dependencies = (s.dependencies || []).filter(d => byId[d]);
  });

  // detect cycles; if any, break them to avoid infinite loop
  const cycles = detectCycles(steps);
  if (cycles.length > 0) {
    // break naively: drop any dependency that would create a cycle
    const seen = new Set();
    for (const s of steps) {
      const safeDeps = [];
      for (const d of s.dependencies) {
        // temp add and test
        const tmp = safeDeps.concat(d);
        const test = steps.map(x => x.id === s.id ? { ...x, dependencies: tmp } : x);
        if (detectCycles(test).length === 0) {
          safeDeps.push(d);
        }
      }
      s.dependencies = safeDeps;
    }
  }

  // Parallel group logic:
  //   - Steps in same group run in parallel
  //   - They share the same start time (max of all group-member deps' end times)
  //   - Group duration = max(member cycleTime)
  //   - Each member's startTime = group start; endTime = start + member cycleTime
  //     (so the "slot" that feeds dependents is the max endTime)

  // Collect group memberships
  const groups = {};
  steps.forEach(s => {
    if (s.groupId) {
      if (!groups[s.groupId]) groups[s.groupId] = [];
      groups[s.groupId].push(s.id);
    }
  });

  // We need topo order that treats a group as a super-node for dependency resolution.
  // Simplification: compute per-step topo order, but when calculating start time for
  // a grouped step, start = max(end of dependencies of ALL group members).

  const order = topoOrder(steps);
  // If topo failed (some missing), fallback to original order:
  const ordered = order.length === steps.length ? order : steps.map(s => s.id);

  // Initialize
  steps.forEach(s => { s.startTime = 0; s.endTime = 0; s.waitTime = 0; });

  // Compute group-aware start times
  const groupStart = {};
  const groupEnd = {};

  ordered.forEach(id => {
    const s = byId[id];
    if (!s) return;
    // collect the end times of all deps (if dep is grouped, use its group's max end)
    const deps = s.dependencies || [];
    let depMaxEnd = 0;
    let depWaitBase = 0;
    deps.forEach(d => {
      const dep = byId[d];
      if (!dep) return;
      let e = 0;
      if (dep.groupId && groupEnd[dep.groupId] !== undefined) e = groupEnd[dep.groupId];
      else e = dep.endTime;
      if (e > depMaxEnd) depMaxEnd = e;
      if (e > depWaitBase) depWaitBase = e;
    });

    if (s.groupId) {
      // All group members share a start. Compute once per group.
      if (groupStart[s.groupId] === undefined) {
        // start = max over all group members' deps' end times
        let start = 0;
        (groups[s.groupId] || []).forEach(mid => {
          const m = byId[mid];
          (m.dependencies || []).forEach(d => {
            const dep = byId[d];
            if (!dep) return;
            let e = 0;
            if (dep.groupId && groupEnd[dep.groupId] !== undefined) e = groupEnd[dep.groupId];
            else e = dep.endTime;
            if (e > start) start = e;
          });
        });
        groupStart[s.groupId] = start;
      }
      s.startTime = groupStart[s.groupId];
      s.endTime = s.startTime + s.cycleTime;
      if (groupEnd[s.groupId] === undefined) groupEnd[s.groupId] = 0;
      if (s.endTime > groupEnd[s.groupId]) groupEnd[s.groupId] = s.endTime;
      s.waitTime = Math.max(0, s.startTime - depWaitBase);
    } else {
      s.startTime = depMaxEnd;
      s.endTime = s.startTime + s.cycleTime;
      s.waitTime = Math.max(0, s.startTime - depWaitBase);
    }
  });

  // totalCycleTime = latest endTime across all steps
  const totalCycleTime = steps.reduce((m, s) => Math.max(m, s.endTime), 0);

  // Critical path: walk from latest ending step backwards along dep with max endTime
  const criticalSet = new Set();
  let tails = steps.filter(s => s.endTime === totalCycleTime);

  const walk = (s) => {
    if (!s || criticalSet.has(s.id)) return;
    criticalSet.add(s.id);
    const deps = (s.dependencies || []).map(d => byId[d]).filter(Boolean);
    if (!deps.length) return;
    // if any dep is grouped, the critical dep is the one with largest endTime (or group end)
    let best = null;
    deps.forEach(d => {
      const e = d.groupId && groupEnd[d.groupId] !== undefined ? groupEnd[d.groupId] : d.endTime;
      if (!best || (e > (best.__e || 0))) best = Object.assign({}, d, { __e: e });
    });
    if (best) {
      // if best has group, add the longest group member to critical
      if (best.groupId) {
        const members = (groups[best.groupId] || []).map(mid => byId[mid]);
        const longest = members.reduce((a, b) => (b.endTime > (a?.endTime || 0) ? b : a), null);
        walk(longest);
      } else {
        walk(byId[best.id]);
      }
    }
  };
  tails.forEach(walk);

  steps.forEach(s => { s.critical = criticalSet.has(s.id); });

  // Bottleneck: step (or group) with max contribution to critical path
  let bottleneck = null;
  steps.forEach(s => {
    if (!s.critical) return;
    if (!bottleneck || s.cycleTime > bottleneck.cycleTime) bottleneck = s;
  });
  steps.forEach(s => { s.bottleneck = bottleneck && s.id === bottleneck.id; });

  // Totals / KPIs
  const sumMachine = steps.reduce((a, s) => a + s.machineTime, 0);
  const sumOp = steps.reduce((a, s) => a + s.operatorTime, 0);
  const sumSetup = steps.reduce((a, s) => a + s.setupTime, 0);
  const sumVA = steps.reduce((a, s) => a + (s.isValueAdded ? s.machineTime + s.operatorTime : 0), 0);
  const sumNVA = (sumMachine + sumOp + sumSetup) - sumVA;
  const effectiveWork = sumMachine + sumOp + sumSetup;

  const vaPct = effectiveWork === 0 ? 0 : Math.round((sumVA / effectiveWork) * 100);
  const nvaPct = 100 - vaPct;

  // Efficiency = VA / totalCycleTime
  const efficiency = totalCycleTime === 0 ? 0 : Math.round((sumVA / totalCycleTime) * 100);
  // Takt efficiency — how close to takt are we running
  const taktEfficiency = totalCycleTime === 0 ? 0 : Math.round((totalCycleTime / Math.max(totalCycleTime, taktTime)) * 100);

  // Sum wait
  const totalWait = steps.reduce((a, s) => a + s.waitTime, 0);

  return {
    steps,
    totalCycleTime,
    takt: taktTime,
    efficiency,
    taktEfficiency,
    bottleneck,
    sumMachine, sumOp, sumSetup, sumVA, sumNVA,
    vaPct, nvaPct,
    totalWait,
    groups,
    groupStart,
    groupEnd,
    criticalSet,
    cycles, // original cycle offenders before fix
  };
}
