import { describe, it, expect } from "vitest";
import { computeSchedule, cycleTimeOf, detectCycles, topoOrder } from "./calc.js";
import { DEFAULT_STEPS } from "../data/templates.js";

describe("cycleTimeOf", () => {
  it("sums machine, operator, and setup", () => {
    expect(cycleTimeOf({ machineTime: 10, operatorTime: 5, setupTime: 2 })).toBe(17);
  });
  it("treats missing numbers as zero", () => {
    expect(cycleTimeOf({})).toBe(0);
  });
});

describe("detectCycles", () => {
  it("returns offenders for a two-node loop", () => {
    const steps = [
      { id: "a", name: "A", machineTime: 1, operatorTime: 0, setupTime: 0, dependencies: ["b"] },
      { id: "b", name: "B", machineTime: 1, operatorTime: 0, setupTime: 0, dependencies: ["a"] },
    ];
    expect(detectCycles(steps).length).toBeGreaterThan(0);
  });
  it("returns empty for acyclic default template", () => {
    expect(detectCycles(DEFAULT_STEPS)).toEqual([]);
  });
});

describe("topoOrder", () => {
  it("returns all ids for a DAG", () => {
    const order = topoOrder(DEFAULT_STEPS);
    expect(order.length).toBe(DEFAULT_STEPS.length);
    expect(new Set(order).size).toBe(DEFAULT_STEPS.length);
  });
});

describe("computeSchedule", () => {
  it("produces positive total CT and a bottleneck on defaults", () => {
    const s = computeSchedule(DEFAULT_STEPS, 240);
    expect(s.totalCycleTime).toBeGreaterThan(0);
    expect(s.bottleneck).toBeTruthy();
    expect(s.bottleneck.name.length).toBeGreaterThan(0);
    expect(s.steps.every((x) => x.endTime >= x.startTime)).toBe(true);
  });

  it("aligns parallel group members to the same start", () => {
    const parallel = DEFAULT_STEPS.map((st) =>
      st.id === "s2" || st.id === "s3" ? { ...st, groupId: "g-test" } : st,
    );
    const s = computeSchedule(parallel, 240);
    const s2 = s.steps.find((x) => x.id === "s2");
    const s3 = s.steps.find((x) => x.id === "s3");
    expect(s2.startTime).toBe(s3.startTime);
  });

  it("does not throw on empty steps", () => {
    const s = computeSchedule([], 60);
    expect(s.totalCycleTime).toBe(0);
    expect(s.bottleneck).toBeNull();
  });
});
