import ExcelJS from "exceljs";

export const LOGICAL_FIELDS = [
  { key: "id", label: "Step ID" },
  { key: "name", label: "Step name" },
  { key: "machineTime", label: "Machine time" },
  { key: "operatorTime", label: "Operator time" },
  { key: "setupTime", label: "Setup time" },
  { key: "transferTime", label: "Transfer time" },
  { key: "dependencies", label: "Dependencies" },
  { key: "groupId", label: "Parallel group" },
  { key: "stationId", label: "Station" },
  { key: "variability", label: "Variability %" },
  { key: "isValueAdded", label: "Value added" },
];

function normalizeHeaderKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Guess logical field from a single header cell */
export function guessFieldForHeader(headerText) {
  const k = normalizeHeaderKey(headerText);
  if (!k) return null;
  if (/^id$/.test(k) || /^stepid$/.test(k)) return "id";
  if (/^(step)?name$|^step$|^process$|^operation$/.test(k)) return "name";
  if (/machine|cyc.*mach/.test(k) && !/operator/.test(k)) return "machineTime";
  if (/(operator|manual|human|labor)/.test(k)) return "operatorTime";
  if (/setup|changeover|smed/.test(k)) return "setupTime";
  if (/transfer|move|walk|convey/.test(k)) return "transferTime";
  if (/dep|pred|predecessor|requires/.test(k)) return "dependencies";
  if (/group|parallel|lane/.test(k)) return "groupId";
  if (/station|cell|line|resource/.test(k)) return "stationId";
  if (/(var|sigma|std|spread)/.test(k) && !/value/.test(k)) return "variability";
  if (/(valueadded|isva|^va$|nva)/.test(k)) return "isValueAdded";
  return null;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseBoolVA(v) {
  if (v === true || v === false) return v;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "n" || s === "no" || s === "false" || s === "0") return false;
  return true;
}

function getCellRaw(rowObj, headerName) {
  if (headerName == null || headerName === "") return "";
  if (Object.prototype.hasOwnProperty.call(rowObj, headerName)) return rowObj[headerName];
  return "";
}

/**
 * First sheet → header row + data rows as objects keyed by header text.
 */
function parseCsvToRows(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if ((c === "\n" && !inQ) || (c === "\r" && !inQ)) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.length || lines.length === 0) lines.push(cur);

  const splitLine = (line) => {
    const cells = [];
    let cell = "";
    let q = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (q && line[j + 1] === '"') {
          cell += '"';
          j++;
        } else {
          q = !q;
        }
      } else if (ch === "," && !q) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  if (lines.length === 0) return { headers: [], rows: [] };
  const headerCells = splitLine(lines[0]);
  const headers = headerCells.map((h, i) => h || `Column${i + 1}`);
  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitLine(lines[r]);
    if (cells.every((c) => c === "")) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    rows.push(obj);
  }
  return { headers, rows };
}

export async function readWorkbookRowsOnce(buffer, fileName = "") {
  const lower = String(fileName).toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(buffer);
    return parseCsvToRows(text);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("No worksheet found");

  let headerRowNum = 1;
  const headers = [];
  for (let r = 1; r <= Math.min(sheet.rowCount, 50); r++) {
    const row = sheet.getRow(r);
    let nonEmpty = 0;
    const line = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const t = cell.text?.trim() ?? String(cell.value ?? "").trim();
      line[col] = t;
      if (t) nonEmpty++;
    });
    if (nonEmpty >= 2) {
      headerRowNum = r;
      const maxC = Math.max(line.length - 1, sheet.columnCount || 0, 40);
      for (let c = 1; c <= maxC; c++) headers[c] = line[c] || "";
      break;
    }
  }

  if (!headers.some(Boolean)) {
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = cell.text?.trim() ?? String(cell.value ?? "").trim();
    });
  }

  const headerList = [];
  const maxCol = headers.length - 1;
  for (let c = 1; c <= maxCol; c++) {
    if (headers[c]) headerList.push(headers[c]);
  }

  const rows = [];
  for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const obj = {};
    let any = false;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const h = headers[col] || `Column${col}`;
      let val = cell.value;
      if (val && typeof val === "object" && "text" in val) val = val.text;
      if (val && typeof val === "object" && "result" in val) val = val.result;
      obj[h] = val;
      if (val !== "" && val != null) any = true;
    });
    if (any) rows.push(obj);
  }

  return { headers: headerList, rows, headerRowNum };
}

export function buildMappingFromHeaders(headers) {
  const used = new Set();
  const mapping = {};
  for (const h of headers) {
    if (!h) continue;
    const g = guessFieldForHeader(h);
    if (g && mapping[g] == null && !used.has(g)) {
      mapping[g] = h;
      used.add(g);
    }
  }
  if (!mapping.name) {
    const fallback = headers.find((h) => h && String(h).trim().length > 0);
    if (fallback) mapping.name = fallback;
  }
  return mapping;
}

export function rowsToStepsWithMapping(rows, mapping) {
  const issues = [];
  const steps = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const n = {};
    for (const { key } of LOGICAL_FIELDS) {
      const hdr = mapping[key];
      if (!hdr) continue;
      n[key] = getCellRaw(raw, hdr);
    }

    const idRaw = n.id;
    const id =
      idRaw !== "" && idRaw != null && String(idRaw).trim() !== ""
        ? String(idRaw).trim()
        : `s${Date.now()}-${idx}`;

    const name =
      n.name !== "" && n.name != null && String(n.name).trim() !== ""
        ? String(n.name).trim()
        : `Step ${idx + 1}`;

    if (!String(n.name ?? "").trim()) {
      issues.push({ row: rowNum, field: "name", msg: "Missing step name", severity: "error" });
    }

    const depsStr = String(n.dependencies ?? "")
      .split(/[,;|\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const mt = num(n.machineTime);
    const ot = num(n.operatorTime);
    const st = num(n.setupTime);
    const tt = num(n.transferTime);
    const va = parseBoolVA(n.isValueAdded);

    if (mt < 0 || ot < 0 || st < 0 || tt < 0) {
      issues.push({ row: rowNum, field: "times", msg: "Negative time value coerced to 0", severity: "warn" });
    }

    steps.push({
      id,
      name,
      machineTime: Math.max(0, mt),
      operatorTime: Math.max(0, ot),
      setupTime: Math.max(0, st),
      transferTime: Math.max(0, tt),
      dependencies: depsStr,
      groupId: n.groupId ? String(n.groupId).trim() || null : null,
      isValueAdded: va,
      stationId: n.stationId ? String(n.stationId).trim() || null : null,
      variability: Math.max(0, num(n.variability)),
      notes: "",
    });
  });

  return { steps, issues };
}

export async function analyzeImportFile(file) {
  const buf = await file.arrayBuffer();
  const fileName = file.name || "";
  const { headers, rows } = await readWorkbookRowsOnce(buf, fileName);
  if (!headers.length) throw new Error("Could not detect column headers");
  const suggested = buildMappingFromHeaders(headers);
  const { steps, issues } = rowsToStepsWithMapping(rows, suggested);
  const idSet = new Set(steps.map((s) => s.id));
  rows.forEach((raw, idx) => {
    const hdr = suggested.dependencies;
    if (!hdr) return;
    const deps = String(getCellRaw(raw, hdr) ?? "")
      .split(/[,;|\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    deps.forEach((d) => {
      if (!idSet.has(d)) {
        issues.push({
          row: idx + 2,
          field: "dependencies",
          msg: `Unknown dependency id "${d}"`,
          severity: "warn",
        });
      }
    });
  });

  return {
    headers,
    rows,
    suggestedMapping: suggested,
    previewSteps: steps.slice(0, 5),
    issues,
    buffer: buf,
    fileName,
  };
}

export async function importStepsFromMapping(buffer, mapping, fileName = "") {
  const { rows } = await readWorkbookRowsOnce(buffer, fileName);
  return rowsToStepsWithMapping(rows, mapping);
}

/** One-shot import with auto column detection */
export async function importStepsFromFile(file) {
  const buf = await file.arrayBuffer();
  const { headers, rows } = await readWorkbookRowsOnce(buf, file.name);
  if (!headers.length) throw new Error("Could not detect column headers");
  const mapping = buildMappingFromHeaders(headers);
  const { steps, issues } = rowsToStepsWithMapping(rows, mapping);
  const fatal = issues.filter((i) => i.severity === "error");
  if (fatal.length) throw new Error(fatal[0].msg || "Import validation failed");
  return steps;
}

export async function exportStepsToExcel(steps, schedule, filename = "cycle-time.xlsx") {
  const byId = {};
  (schedule?.steps || []).forEach((s) => {
    byId[s.id] = s;
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Steps");

  ws.addRow([
    "#",
    "ID",
    "Step Name",
    "Machine Time",
    "Operator Time",
    "Setup Time",
    "Transfer Time",
    "Cycle Time",
    "Start Time",
    "End Time",
    "Wait Time",
    "Dependencies",
    "Group",
    "Station",
    "Value Added",
    "Variability (%)",
    "Critical",
    "Bottleneck",
  ]);

  steps.forEach((s, i) => {
    const sc = byId[s.id] || {};
    ws.addRow([
      i + 1,
      s.id,
      s.name,
      Number(s.machineTime) || 0,
      Number(s.operatorTime) || 0,
      Number(s.setupTime) || 0,
      Number(s.transferTime) || 0,
      sc.cycleTime ??
        (Number(s.machineTime) || 0) + (Number(s.operatorTime) || 0) + (Number(s.setupTime) || 0),
      sc.startTime ?? 0,
      sc.endTime ?? 0,
      sc.waitTime ?? 0,
      (s.dependencies || []).join("|"),
      s.groupId || "",
      s.stationId || "",
      s.isValueAdded !== false ? "Y" : "N",
      Number(s.variability) || 0,
      sc.critical ? "Y" : "N",
      sc.bottleneck ? "Y" : "N",
    ]);
  });

  if (schedule) {
    const kpi = wb.addWorksheet("KPI");
    kpi.addRow([
      "Total Cycle Time",
      "Takt",
      "Efficiency (%)",
      "Bottleneck",
      "VA (s)",
      "NVA (s)",
      "VA %",
    ]);
    kpi.addRow([
      schedule.totalCycleTime,
      schedule.takt,
      schedule.efficiency,
      schedule.bottleneck?.name || "",
      schedule.sumVA,
      schedule.sumNVA,
      schedule.vaPct,
    ]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function downloadTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Template");
  ws.addRow([
    "id",
    "name",
    "machineTime",
    "operatorTime",
    "setupTime",
    "transferTime",
    "dependencies",
    "group",
    "station",
    "variability",
    "isValueAdded",
  ]);
  ws.addRow(["s1", "Example Machine Step", 30, 10, 4, 0, "", "", "ST-1", 5, true]);
  ws.addRow(["s2", "Example Operator Step", 0, 25, 2, 0, "s1", "", "ST-1", 8, true]);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cycle-time-template.xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}
