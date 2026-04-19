import { LONG_TRAIL_42_STEPS } from "./long-trail-template.js";

// Pre-built process templates — industrial standards
export const TEMPLATES = [
  {
    id: "tmpl-auto-assembly",
    name: "Automotive Sub-assembly (10-step)",
    description: "10-step robotic assembly line with QC inline and EOL test.",
    sector: "Automotive",
    steps: [
      { id: "s1", name: "Frame Preparation",   machineTime: 22, operatorTime: 12, setupTime: 6,  transferTime: 0, dependencies: [],         stationId: "ST-1", isValueAdded: true, variability: 5 },
      { id: "s2", name: "Weld Station A",      machineTime: 48, operatorTime: 18, setupTime: 8,  transferTime: 2, dependencies: ["s1"],     stationId: "ST-2", isValueAdded: true, variability: 6 },
      { id: "s3", name: "Sub-assembly Load",   machineTime: 12, operatorTime: 24, setupTime: 4,  transferTime: 0, dependencies: ["s1"],     stationId: "ST-2", isValueAdded: true, variability: 10 },
      { id: "s4", name: "Robotic Fastening",   machineTime: 86, operatorTime: 8,  setupTime: 10, transferTime: 2, dependencies: ["s2","s3"], stationId: "ST-3", isValueAdded: true, variability: 4 },
      { id: "s5", name: "Sensor Mount",        machineTime: 18, operatorTime: 22, setupTime: 5,  transferTime: 0, dependencies: ["s4"],     stationId: "ST-4", isValueAdded: true, variability: 7 },
      { id: "s6", name: "Inline QC Vision",    machineTime: 26, operatorTime: 6,  setupTime: 4,  transferTime: 0, dependencies: ["s4"],     stationId: "ST-4", isValueAdded: false, variability: 3 },
      { id: "s7", name: "Wiring Harness",      machineTime: 14, operatorTime: 32, setupTime: 6,  transferTime: 0, dependencies: ["s5"],     stationId: "ST-5", isValueAdded: true, variability: 9 },
      { id: "s8", name: "Final Torque",        machineTime: 20, operatorTime: 14, setupTime: 4,  transferTime: 0, dependencies: ["s6","s7"], stationId: "ST-5", isValueAdded: true, variability: 5 },
      { id: "s9", name: "End-of-Line Test",    machineTime: 34, operatorTime: 10, setupTime: 3,  transferTime: 0, dependencies: ["s8"],     stationId: "ST-6", isValueAdded: false, variability: 4 },
      { id: "s10",name: "Pack & Label",        machineTime: 10, operatorTime: 18, setupTime: 2,  transferTime: 2, dependencies: ["s9"],     stationId: "ST-6", isValueAdded: false, variability: 6 },
    ],
    taktTime: 240,
  },
  {
    id: "tmpl-cnc",
    name: "CNC Machining Cell",
    description: "5-step CNC cell: load, rough, finish, inspect, unload.",
    sector: "Machining",
    steps: [
      { id: "m1", name: "Load Part",         machineTime: 0,  operatorTime: 25, setupTime: 5, transferTime: 0, dependencies: [],      stationId: "C-1", isValueAdded: false, variability: 10 },
      { id: "m2", name: "Rough Milling",     machineTime: 120, operatorTime: 0, setupTime: 8, transferTime: 0, dependencies: ["m1"], stationId: "C-1", isValueAdded: true, variability: 3 },
      { id: "m3", name: "Finish Milling",    machineTime: 95,  operatorTime: 0, setupTime: 4, transferTime: 0, dependencies: ["m2"], stationId: "C-1", isValueAdded: true, variability: 2 },
      { id: "m4", name: "CMM Inspection",    machineTime: 40,  operatorTime: 8, setupTime: 2, transferTime: 0, dependencies: ["m3"], stationId: "C-2", isValueAdded: false, variability: 4 },
      { id: "m5", name: "Unload / Dedust",   machineTime: 0,  operatorTime: 22, setupTime: 2, transferTime: 0, dependencies: ["m4"], stationId: "C-1", isValueAdded: false, variability: 8 },
    ],
    taktTime: 300,
  },
  {
    id: "tmpl-injection",
    name: "Injection Molding + Trim",
    description: "Injection, cooling, trim, QC — 6 steps.",
    sector: "Plastics",
    steps: [
      { id: "i1", name: "Load Mold",       machineTime: 0,  operatorTime: 12, setupTime: 20, transferTime: 0, dependencies: [],        stationId: "IM-1", isValueAdded: false, variability: 15 },
      { id: "i2", name: "Inject Cycle",    machineTime: 45, operatorTime: 0,  setupTime: 0,  transferTime: 0, dependencies: ["i1"],   stationId: "IM-1", isValueAdded: true, variability: 2 },
      { id: "i3", name: "Cool & Set",      machineTime: 35, operatorTime: 0,  setupTime: 0,  transferTime: 0, dependencies: ["i2"],   stationId: "IM-1", isValueAdded: true, variability: 3 },
      { id: "i4", name: "Eject & Pick",    machineTime: 8,  operatorTime: 6,  setupTime: 0,  transferTime: 2, dependencies: ["i3"],   stationId: "IM-1", isValueAdded: false, variability: 5 },
      { id: "i5", name: "Trim / Deburr",   machineTime: 6,  operatorTime: 18, setupTime: 2,  transferTime: 0, dependencies: ["i4"],   stationId: "TR-1", isValueAdded: true, variability: 10 },
      { id: "i6", name: "Visual QC",       machineTime: 0,  operatorTime: 14, setupTime: 0,  transferTime: 0, dependencies: ["i5"],   stationId: "QC-1", isValueAdded: false, variability: 8 },
    ],
    taktTime: 120,
  },
  {
    id: "tmpl-packaging",
    name: "Consumer Packaging Line",
    description: "Fill, cap, label, pack — parallel labeling branch.",
    sector: "Packaging",
    steps: [
      { id: "p1", name: "Bottle Feed",  machineTime: 4,  operatorTime: 2, setupTime: 2, transferTime: 0, dependencies: [],        stationId: "LN-1", isValueAdded: false, variability: 5 },
      { id: "p2", name: "Fill",         machineTime: 12, operatorTime: 0, setupTime: 4, transferTime: 0, dependencies: ["p1"],   stationId: "LN-1", isValueAdded: true, variability: 3 },
      { id: "p3", name: "Cap",          machineTime: 6,  operatorTime: 0, setupTime: 2, transferTime: 0, dependencies: ["p2"],   stationId: "LN-1", isValueAdded: true, variability: 4 },
      { id: "p4", name: "Label A (Front)", machineTime: 8,  operatorTime: 0, setupTime: 2, transferTime: 0, dependencies: ["p3"], groupId: "g-label", stationId: "LN-2", isValueAdded: true, variability: 3 },
      { id: "p5", name: "Label B (Back)",  machineTime: 8,  operatorTime: 0, setupTime: 2, transferTime: 0, dependencies: ["p3"], groupId: "g-label", stationId: "LN-2", isValueAdded: true, variability: 3 },
      { id: "p6", name: "Inkjet Code", machineTime: 4,  operatorTime: 0, setupTime: 1, transferTime: 0, dependencies: ["p4","p5"], stationId: "LN-2", isValueAdded: false, variability: 4 },
      { id: "p7", name: "Case Pack",   machineTime: 10, operatorTime: 4, setupTime: 3, transferTime: 0, dependencies: ["p6"],   stationId: "LN-3", isValueAdded: false, variability: 5 },
    ],
    taktTime: 45,
  },
  {
    id: "tmpl-long-trail-42",
    name: "Assembly trail — 42 steps (demo)",
    description: "Linear chain across 8 stations. Enable Serialize same station in Settings for queue wait + heatmap; use Value-added checkbox for VA/NVA KPIs.",
    sector: "Demo",
    steps: LONG_TRAIL_42_STEPS,
    taktTime: 280,
  },
];

export const DEFAULT_STEPS = TEMPLATES[0].steps;
export const DEFAULT_TAKT = TEMPLATES[0].taktTime;
