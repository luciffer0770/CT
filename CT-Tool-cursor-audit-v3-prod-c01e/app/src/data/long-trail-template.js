/** 42-step linear assembly-style trail for demos (line balance, long Gantt, scroll tests) */
export const LONG_TRAIL_42_STEPS = (() => {
  const steps = [];
  for (let i = 0; i < 42; i++) {
    const n = i + 1;
    const id = `trail-${String(n).padStart(2, "0")}`;
    const prev = i === 0 ? null : `trail-${String(i).padStart(2, "0")}`;
    steps.push({
      id,
      name: `Process ${n} — cell ${(i % 8) + 1}`,
      machineTime: 10 + (i % 11),
      operatorTime: 5 + (i % 7),
      setupTime: i % 6 === 0 ? 5 : 2,
      transferTime: 0,
      dependencies: prev ? [prev] : [],
      stationId: `ST-${(i % 8) + 1}`,
      isValueAdded: i % 9 !== 6,
      variability: 4 + (i % 10),
      notes: "",
    });
  }
  return steps;
})();
