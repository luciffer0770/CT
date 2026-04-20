/**
 * 42-step showcase: linear chain → parallel pair → merge → long tail.
 * Includes NVA step, waste tags (muda/mura/muri), notes, transfer times,
 * one heavy bottleneck step, and shared stations for serialize-station demos.
 */

const STATIONS = ["ST-1", "ST-2", "ST-3", "ST-4", "ST-5", "ST-6"];

export const LONG_TRAIL_42_STEPS = (() => {
  const steps = [];
  const id = (n) => `trail-${String(n).padStart(2, "0")}`;

  for (let n = 1; n <= 42; n++) {
    const i = n - 1;
    let dependencies = [];
    let groupId = null;
    let name = `Process ${n} — ${STATIONS[i % STATIONS.length]}`;
    let machineTime = 8 + (i % 9);
    let operatorTime = 4 + (i % 6);
    let setupTime = i % 7 === 0 ? 6 : 2;
    let transferTime = i % 4 === 0 ? 6 : i % 4 === 2 ? 3 : 0;
    let stationId = STATIONS[i % STATIONS.length];
    let isValueAdded = true;
    let variability = 5 + (i % 8);
    let notes = "";
    let wasteType = null;

    if (n === 1) {
      dependencies = [];
      notes =
        "Showcase: Settings → Serialize same station (queue + heatmap). Schedule → Deps. Simulation A/B. Reports → Export PDF.";
    } else if (n <= 11) {
      dependencies = [id(n - 1)];
    } else if (n === 12 || n === 13) {
      dependencies = [id(n - 1)];
    } else if (n === 14 || n === 15) {
      dependencies = [id(12), id(13)];
      groupId = "g-demo-parallel";
      name = n === 14 ? "Parallel path A — merge cell" : "Parallel path B — merge cell";
    } else if (n === 16) {
      dependencies = [id(14), id(15)];
    } else {
      dependencies = [id(n - 1)];
    }

    if (n === 7) {
      isValueAdded = false;
      wasteType = "muda";
      name = "Inspection hold (NVA demo) — ST-2";
      notes = "Uncheck Value-added affects VA% / efficiency KPIs.";
    }
    if (n === 22) {
      wasteType = "mura";
      notes = "Mura tag — see Analytics waste tally.";
    }
    if (n === 29) {
      wasteType = "muri";
      machineTime = Math.min(42, machineTime + 10);
      notes = "Muri tag — overload context with station balance.";
    }
    if (n === 18) {
      machineTime = 78;
      operatorTime = 10;
      setupTime = 8;
      stationId = "ST-2";
      name = "Heavy station cycle (bottleneck demo) — ST-2";
      notes = "Dominant critical-path step — try Simulation sliders.";
    }

    steps.push({
      id: id(n),
      name,
      machineTime,
      operatorTime,
      setupTime,
      transferTime,
      dependencies,
      stationId,
      isValueAdded,
      variability,
      notes,
      wasteType,
      groupId,
    });
  }
  return steps;
})();

/** Second snapshot for multi-line compare (Settings): slightly faster variant */
export const LONG_TRAIL_MULTILINE_DEMO = {
  id: "demo-line-alt",
  label: "Showcase — leaner variant (compare)",
  taktTime: 220,
  steps: LONG_TRAIL_42_STEPS.map((s, idx) => ({
    ...s,
    id: `alt-${s.id}`,
    name: `(Alt) ${s.name}`,
    dependencies: (s.dependencies || []).map((d) => `alt-${d}`),
    groupId: s.groupId ? `${s.groupId}-alt` : null,
    machineTime: idx === 17 ? Math.max(0, (s.machineTime || 0) - 15) : s.machineTime,
  })),
};
