import React from "react";
import Gantt from "./Gantt.jsx";

export default function Swimlane({ schedule, takt, onStepClick }) {
  const stations = {};
  schedule.steps.forEach(s => {
    const st = s.stationId || "UNASSIGNED";
    if (!stations[st]) stations[st] = [];
    stations[st].push(s);
  });
  const entries = Object.entries(stations).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return null;
  return (
    <div>
      {entries.map(([st, items]) => (
        <div key={st} style={{ marginBottom: 12 }}>
          <div className="lane-head">
            <span>{st} · {items.length} step{items.length === 1 ? "" : "s"}</span>
            <span className="mono" style={{ color: "var(--ink-4)" }}>
              ∑ {items.reduce((a, s) => a + s.cycleTime, 0)}s
            </span>
          </div>
          <Gantt
            steps={items}
            totalCT={schedule.totalCycleTime}
            takt={takt}
            tickEvery={30}
            labelWidth={160}
            onStepClick={onStepClick}
          />
        </div>
      ))}
    </div>
  );
}
