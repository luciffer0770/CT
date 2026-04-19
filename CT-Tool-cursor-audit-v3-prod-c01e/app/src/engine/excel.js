import * as XLSX from "xlsx";

// Import XLSX/CSV → steps[]
export async function importStepsFromFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return mapRowsToSteps(rows);
}

// Column header mapping (case-insensitive, tolerant)
function mapRowsToSteps(rows) {
  return rows
    .map((r, idx) => {
      const n = normalize(r);
      const id = String(n.id || `s${Date.now()}-${idx}`);
      const deps = String(n.dependencies || "")
        .split(/[,;|]/)
        .map(s => s.trim())
        .filter(Boolean);
      return {
        id,
        name: String(n.name || `Step ${idx + 1}`),
        machineTime: num(n.machineTime),
        operatorTime: num(n.operatorTime),
        setupTime: num(n.setupTime),
        transferTime: num(n.transferTime),
        dependencies: deps,
        groupId: n.groupId ? String(n.groupId) : null,
        isValueAdded: n.isValueAdded === false || String(n.isValueAdded).toLowerCase() === "false" ? false : true,
        stationId: n.stationId ? String(n.stationId) : null,
        variability: num(n.variability),
      };
    });
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function normalize(r) {
  const out = {};
  for (const key of Object.keys(r)) {
    const k = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    const v = r[key];
    if (/^id$/.test(k)) out.id = v;
    else if (/^(step)?name$|^step$|^process$/.test(k)) out.name = v;
    else if (/machine/.test(k)) out.machineTime = v;
    else if (/(operator|manual|human)/.test(k)) out.operatorTime = v;
    else if (/setup/.test(k)) out.setupTime = v;
    else if (/transfer|move/.test(k)) out.transferTime = v;
    else if (/dep/.test(k)) out.dependencies = v;
    else if (/group|parallel/.test(k)) out.groupId = v;
    else if (/(valueadded|isva|va)/.test(k) && !/vary|var/.test(k)) out.isValueAdded = v;
    else if (/station|cell/.test(k)) out.stationId = v;
    else if (/(var|sigma|std)/.test(k)) out.variability = v;
  }
  return out;
}

// Export steps (and schedule) → XLSX
export function exportStepsToExcel(steps, schedule, filename = "cycle-time.xlsx") {
  const byId = {};
  (schedule?.steps || []).forEach(s => { byId[s.id] = s; });
  const rows = steps.map((s, i) => {
    const sc = byId[s.id] || {};
    return {
      "#": i + 1,
      "ID": s.id,
      "Step Name": s.name,
      "Machine Time": Number(s.machineTime) || 0,
      "Operator Time": Number(s.operatorTime) || 0,
      "Setup Time": Number(s.setupTime) || 0,
      "Transfer Time": Number(s.transferTime) || 0,
      "Cycle Time": sc.cycleTime ?? ((s.machineTime || 0) + (s.operatorTime || 0) + (s.setupTime || 0)),
      "Start Time": sc.startTime ?? 0,
      "End Time": sc.endTime ?? 0,
      "Wait Time": sc.waitTime ?? 0,
      "Dependencies": (s.dependencies || []).join("|"),
      "Group": s.groupId || "",
      "Station": s.stationId || "",
      "Value Added": s.isValueAdded !== false ? "Y" : "N",
      "Variability (%)": Number(s.variability) || 0,
      "Critical": sc.critical ? "Y" : "N",
      "Bottleneck": sc.bottleneck ? "Y" : "N",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Steps");
  if (schedule) {
    const kpi = XLSX.utils.json_to_sheet([{
      "Total Cycle Time": schedule.totalCycleTime,
      "Takt": schedule.takt,
      "Efficiency (%)": schedule.efficiency,
      "Bottleneck": schedule.bottleneck?.name || "",
      "VA (s)": schedule.sumVA,
      "NVA (s)": schedule.sumNVA,
      "VA %": schedule.vaPct,
    }]);
    XLSX.utils.book_append_sheet(wb, kpi, "KPI");
  }
  XLSX.writeFile(wb, filename);
}

export function downloadTemplate() {
  const rows = [
    { id: "s1", name: "Example Machine Step", machineTime: 30, operatorTime: 10, setupTime: 4, transferTime: 0, dependencies: "", group: "", station: "ST-1", variability: 5, isValueAdded: true },
    { id: "s2", name: "Example Operator Step", machineTime: 0, operatorTime: 25, setupTime: 2, transferTime: 0, dependencies: "s1", group: "", station: "ST-1", variability: 8, isValueAdded: true },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "cycle-time-template.xlsx");
}
