/**
 * 42-step linear assembly-style trail for demos (line balance, long Gantt, scroll tests).
 *
 * Tips for a rich demo:
 * - Turn on **Settings → Serialize same station** to create queue wait at shared stations
 *   (heatmap uses max wait across rows — good contrast).
 * - Toggle **Value-added** on steps to see VA/NVA % change (classification only; times stay in the schedule).
 */
export const LONG_TRAIL_42_STEPS = (() => {
  const steps = [];
  for (let i = 0; i < 42; i++) {
    const n = i + 1;
    const id = `trail-${String(n).padStart(2, "0")}`;
    const prev = i === 0 ? null : `trail-${String(i).padStart(2, "0")}`;
    const cell = (i % 8) + 1;
    // Slight asymmetry so bottleneck is not the last step; transfer varies for NVA / move-time demos
    const transferTime = i % 5 === 0 ? 8 : i % 3 === 0 ? 4 : 0;
    steps.push({
      id,
      name: `Process ${n} — cell ${cell}`,
      machineTime: 10 + (i % 11),
      operatorTime: 5 + (i % 7),
      setupTime: i % 6 === 0 ? 5 : 2,
      transferTime,
      dependencies: prev ? [prev] : [],
      stationId: `ST-${cell}`,
      // ~1/5 of steps marked NVA for visible VA/NVA split when toggling checkbox
      isValueAdded: i % 5 !== 2,
      variability: 4 + (i % 10),
      notes: i === 0 ? "Demo line: enable Serialize same station in Settings to see wait + heatmap contrast." : "",
    });
  }
  return steps;
})();
