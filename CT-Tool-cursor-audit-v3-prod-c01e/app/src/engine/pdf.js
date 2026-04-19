import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { paretoSteps, costPerUnit } from "./analytics.js";

export function exportReportToPDF({
  project,
  schedule,
  reportId = `R-${Date.now()}`,
  title = "Cycle Time Report",
  insights = [],
  sections = {},
  oee = null,
  waste = null,
  overloads = null,
  taktCalcSec = null,
  laborRate,
  machineRate,
  availableTimeMin,
  demandPerShift,
}) {
  const sec = {
    kpi: true,
    steps: true,
    gantt: true,
    pareto: true,
    cost: true,
    critical: true,
    notes: true,
    oee: true,
    lean: true,
    overload: true,
    taktTool: true,
    ...sections,
  };

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header (no prism bar, clean top rule)
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(2);
  doc.line(40, 40, pageW - 40, 40);
  doc.setLineWidth(1);
  doc.setDrawColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("CYCLE TIME REPORT", 40, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text(title, 40, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  const meta = `${project?.line || "LINE-07"} · ${project?.shift || "Shift B"} · ${new Date().toLocaleString()}`;
  doc.text(meta, 40, 96);

  if (project?.author) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const author = project.role ? `${project.author}, ${project.role}` : project.author;
    doc.text(author, 40, 110);
    if (project.email) doc.text(project.email, 40, 122);
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`ID ${reportId}   REV v${project?.versionCount ?? 0}`, pageW - 40, 60, { align: "right" });

  let tableStartY = 118;
  if (!sec.kpi) tableStartY = 110;
  if (sec.kpi) {
    const kpi = [
      { label: "CYCLE TIME", val: `${schedule.totalCycleTime}s` },
      { label: "TAKT", val: `${schedule.takt}s` },
      { label: "EFFICIENCY", val: `${schedule.efficiency}%` },
      { label: "BOTTLENECK", val: (schedule.bottleneck?.name || "—").slice(0, 28) },
      { label: "TOTAL WAIT", val: `${schedule.totalWait ?? 0}s` },
      { label: "VA / NVA", val: `${schedule.vaPct}% / ${schedule.nvaPct}%` },
      { label: "STEPS", val: `${schedule.steps.length}` },
      { label: "CP WORK", val: `${schedule.criticalPathWorkSum ?? "—"}s` },
    ];
    const cols = 4;
    const boxW = (pageW - 80) / cols - 8;
    const kyKpi = 118;
    kpi.forEach((k, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const kx = 40 + col * (boxW + 10);
      const ky = kyKpi + row * 56;
      doc.setDrawColor(210);
      doc.rect(kx, ky, boxW, 48);
      doc.setFontSize(7); doc.setTextColor(130);
      doc.setFont("helvetica", "normal");
      doc.text(k.label, kx + 8, ky + 12);
      doc.setFontSize(k.val.length > 14 ? 12 : 15); doc.setTextColor(20);
      doc.setFont("helvetica", "bold");
      doc.text(String(k.val), kx + 8, ky + 34);
      doc.setFont("helvetica", "normal");
    });
    tableStartY = kyKpi + Math.ceil(kpi.length / cols) * 56 + 12;
  }

  if (Array.isArray(insights) && insights.length) {
    doc.setFontSize(8);
    doc.setTextColor(60);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", 40, tableStartY);
    doc.setFont("helvetica", "normal");
    let iy = tableStartY + 12;
    insights.slice(0, 5).forEach((line) => {
      doc.text(`• ${String(line).slice(0, 118)}`, 44, iy);
      iy += 11;
    });
    tableStartY = iy + 8;
  }

  if (sec.steps) {
    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Step", "Station", "Machine", "Operator", "Setup", "Cycle", "Start", "End", "Wait", "Status"]],
      body: schedule.steps.map((s, i) => [
        i + 1,
        s.name,
        s.stationId || "—",
        `${s.machineTime}s`,
        `${s.operatorTime}s`,
        `${s.setupTime}s`,
        `${s.cycleTime}s`,
        `${s.startTime}s`,
        `${s.endTime}s`,
        `${s.waitTime}s`,
        s.bottleneck ? "BOTTLENECK" : s.critical ? "CRITICAL" : "OPTIMAL",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 10) {
          const v = data.cell.raw;
          if (v === "BOTTLENECK") {
            doc.setFillColor(253, 236, 238);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            doc.setTextColor(225, 29, 46);
            doc.setFont("helvetica", "bold");
            doc.text(v, data.cell.x + 4, data.cell.y + data.cell.height - 5);
            doc.setTextColor(20);
            doc.setFont("helvetica", "normal");
          }
        }
      },
    });
  }

  doc.addPage();
  let y2 = 50;
  if (sec.gantt) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Gantt Snapshot", 40, y2);
    drawGantt(doc, schedule, 40, y2 + 20, pageW - 80, 320);
    y2 += 360;
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(120);
    doc.text("Gantt section omitted (disabled in report contents).", 40, y2);
    y2 += 20;
  }

  if (sec.pareto) {
    const pareto = paretoSteps(schedule.steps);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Pareto (80/20)", 40, y2);
    autoTable(doc, {
      startY: y2 + 8,
      head: [["#", "Step", "Cycle", "Cumulative %", "Zone"]],
      body: pareto.map((d, i) => [
        i + 1,
        String(d.name).slice(0, 36),
        `${d.value}s`,
        `${d.cumPct.toFixed(1)}%`,
        d.cumPct <= 80 ? "VITAL FEW" : "USEFUL MANY",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });
    y2 = (doc.lastAutoTable?.finalY ?? y2 + 100) + 16;
  }

  doc.addPage();
  let y3 = 50;
  const pageH = doc.internal.pageSize.getHeight();
  const ensureSpace = (need) => {
    if (y3 + need > pageH - 40) {
      doc.addPage();
      y3 = 50;
    }
  };

  if (sec.cost) {
    ensureSpace(80);
    const cost = costPerUnit(schedule.steps, { laborRate: laborRate ?? 35, machineRate: machineRate ?? 80 });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Cost & throughput", 40, y3);
    y3 += 14;
    autoTable(doc, {
      startY: y3,
      head: [["Item", "Value"]],
      body: [
        ["Labour / unit", `$${cost.labor.toFixed(3)}`],
        ["Machine / unit", `$${cost.machine.toFixed(3)}`],
        ["Total / unit", `$${cost.total.toFixed(2)}`],
        ["Units / hr @ takt", `${Math.floor(3600 / Math.max(1, schedule.takt))}`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });
    y3 = (doc.lastAutoTable?.finalY ?? y3) + 20;
  }

  if (sec.critical) {
    ensureSpace(60);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Critical path", 40, y3);
    y3 += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40);
    const chain = schedule.steps.filter((s) => s.critical).map((s) => s.name).join(" → ") || "—";
    const lines = doc.splitTextToSize(chain, pageW - 80);
    doc.text(lines, 40, y3);
    y3 += lines.length * 11 + 8;
    doc.setTextColor(100);
    doc.text(`Path work sum: ${schedule.criticalPathWorkSum ?? "—"}s · CT: ${schedule.totalCycleTime}s`, 40, y3);
    y3 += 18;
  }

  if (sec.notes) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Notes", 40, y3);
    y3 += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const noted = schedule.steps.filter((s) => s.notes);
    if (!noted.length) {
      doc.setTextColor(120);
      doc.text("— no notes —", 40, y3);
      y3 += 16;
    } else {
      noted.slice(0, 12).forEach((s) => {
        ensureSpace(24);
        doc.setTextColor(40);
        const t = doc.splitTextToSize(`${s.name}: ${s.notes}`, pageW - 80);
        doc.text(t, 40, y3);
        y3 += t.length * 11 + 4;
      });
    }
  }

  if (sec.oee && oee) {
    ensureSpace(50);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("OEE (model proxy)", 40, y3);
    y3 += 12;
    autoTable(doc, {
      startY: y3,
      head: [["A", "P", "Q", "OEE"]],
      body: [[`${oee.availability}%`, `${oee.performance}%`, `${oee.quality}%`, `${oee.oee}%`]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });
    y3 = (doc.lastAutoTable?.finalY ?? y3) + 16;
  }

  if (sec.lean && waste) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Lean waste tags", 40, y3);
    y3 += 12;
    autoTable(doc, {
      startY: y3,
      head: [["Muda", "Mura", "Muri"]],
      body: [[String(waste.muda), String(waste.mura), String(waste.muri)]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });
    y3 = (doc.lastAutoTable?.finalY ?? y3) + 16;
  }

  if (sec.overload && overloads && overloads.length) {
    ensureSpace(60);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Station overload vs takt", 40, y3);
    y3 += 12;
    autoTable(doc, {
      startY: y3,
      head: [["Station", "Load (s)", "Over (s)"]],
      body: overloads.map((o) => [o.station, String(o.loadSec), String(o.overBy)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });
    y3 = (doc.lastAutoTable?.finalY ?? y3) + 16;
  }

  if (sec.taktTool && taktCalcSec != null) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Takt calculator", 40, y3);
    y3 += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40);
    doc.text(
      `Available ${availableTimeMin ?? 420} min ÷ demand ${demandPerShift ?? 100} u/shift → ${taktCalcSec}s (line takt ${schedule.takt}s).`,
      40,
      y3,
      { maxWidth: pageW - 80 },
    );
  }

  // Footer
  const nPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= nPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`CYCLE TIME ANALYZER · INDUSTRIAL EDITION`, 40, doc.internal.pageSize.getHeight() - 20);
    doc.text(`PAGE ${i} / ${nPages}`, pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`${reportId}.pdf`);
}

function drawGantt(doc, schedule, x, y, w, h) {
  const steps = schedule.steps;
  if (!steps.length) return;
  const total = Math.max(schedule.totalCycleTime, schedule.takt) * 1.05;
  const labelW = 120;
  const trackW = w - labelW;
  const rowH = Math.max(14, Math.min(26, (h - 30) / steps.length));
  doc.setDrawColor(220);
  const tickEvery = 20;
  for (let t = 0; t <= total; t += tickEvery) {
    const tx = x + labelW + (t / total) * trackW;
    doc.line(tx, y, tx, y + steps.length * rowH);
  }
  doc.setFontSize(8); doc.setTextColor(120);
  for (let t = 0; t <= total; t += tickEvery * 2) {
    const tx = x + labelW + (t / total) * trackW;
    doc.text(`${t}s`, tx, y - 2);
  }
  const tktx = x + labelW + (schedule.takt / total) * trackW;
  doc.setDrawColor(225, 29, 46);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(tktx, y, tktx, y + steps.length * rowH);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(225, 29, 46);
  doc.text(`TAKT ${schedule.takt}s`, tktx + 2, y + 10);

  steps.forEach((s, i) => {
    const ry = y + i * rowH + 2;
    doc.setTextColor(40); doc.setFontSize(8);
    doc.text(s.name.slice(0, 20), x, ry + rowH / 2 + 2);
    const setupX = x + labelW + (s.startTime / total) * trackW;
    const setupW = (s.setupTime / total) * trackW;
    const machX = setupX + setupW;
    const machW = (s.machineTime / total) * trackW;
    const opX = machX + machW;
    const opW = (s.operatorTime / total) * trackW;
    doc.setFillColor("#6D28D9"); doc.rect(setupX, ry, setupW, rowH - 6, "F");
    doc.setFillColor(s.bottleneck ? "#E11D2E" : "#1E40AF"); doc.rect(machX, ry, machW, rowH - 6, "F");
    doc.setFillColor("#06B6D4"); doc.rect(opX, ry, opW, rowH - 6, "F");
  });
}

export function exportKPIsToPDF({ schedule, title = "KPI Snapshot" }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(title, 40, 50);
  const rows = [
    ["Total Cycle Time", `${schedule.totalCycleTime}s`],
    ["Takt", `${schedule.takt}s`],
    ["Efficiency", `${schedule.efficiency}%`],
    ["VA Ratio", `${schedule.vaPct}%`],
    ["Bottleneck", schedule.bottleneck?.name || "—"],
    ["Step Count", `${schedule.steps.length}`],
    ["Total Wait", `${schedule.totalWait}s`],
  ];
  autoTable(doc, {
    startY: 80, head: [["Metric", "Value"]], body: rows,
    headStyles: { fillColor: [30, 64, 175] },
  });
  doc.save(`kpi-${Date.now()}.pdf`);
}

// Export Gantt as SVG file
export function exportGanttSVG(schedule, filename = "gantt.svg") {
  const steps = schedule.steps;
  if (!steps.length) return;
  const rowH = 28;
  const labelW = 160;
  const chartW = 1100;
  const totalW = labelW + chartW + 20;
  const maxX = Math.max(schedule.totalCycleTime, schedule.takt) * 1.05 || 1;
  const scale = chartW / maxX;
  const tickEvery = 20;

  let body = "";
  // axis
  for (let t = 0; t <= maxX; t += tickEvery) {
    const tx = labelW + t * scale;
    const isMajor = t % (tickEvery * 2) === 0;
    body += `<line x1="${tx}" y1="26" x2="${tx}" y2="${26 + steps.length * rowH}" stroke="${isMajor ? '#CFD5E2' : '#E2E6EF'}" stroke-width="1"/>`;
    if (isMajor) body += `<text x="${tx + 3}" y="18" font-size="10" fill="#5B6274" font-family="system-ui">${t}s</text>`;
  }
  // takt line
  const ttx = labelW + schedule.takt * scale;
  body += `<line x1="${ttx}" y1="0" x2="${ttx}" y2="${26 + steps.length * rowH}" stroke="#E11D2E" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  body += `<text x="${ttx + 3}" y="12" font-size="10" fill="#E11D2E" font-family="system-ui" font-weight="600">TAKT ${schedule.takt}s</text>`;

  steps.forEach((s, i) => {
    const ry = 26 + i * rowH;
    body += `<text x="6" y="${ry + rowH / 2 + 4}" font-size="11" fill="#0B1020" font-family="system-ui">${escapeXml(`${String(i+1).padStart(2,"0")} ${s.name}`)}</text>`;
    // setup
    if (s.setupTime > 0)
      body += `<rect x="${labelW + s.startTime * scale}" y="${ry + 5}" width="${s.setupTime * scale}" height="${rowH - 10}" fill="#6D28D9" rx="2"/>`;
    // machine
    if (s.machineTime > 0)
      body += `<rect x="${labelW + (s.startTime + s.setupTime) * scale}" y="${ry + 5}" width="${s.machineTime * scale}" height="${rowH - 10}" fill="${s.bottleneck ? '#E11D2E' : '#1E40AF'}" rx="2"/>`;
    // operator
    if (s.operatorTime > 0)
      body += `<rect x="${labelW + (s.startTime + s.setupTime + s.machineTime) * scale}" y="${ry + 5}" width="${s.operatorTime * scale}" height="${rowH - 10}" fill="#06B6D4" rx="2"/>`;
  });

  const totalH = 26 + steps.length * rowH + 10;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" fill="white"/>
  ${body}
</svg>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Export Gantt as PNG via canvas rasterisation of the SVG
export function exportGanttPNG(schedule, filename = "gantt.png") {
  const steps = schedule.steps;
  if (!steps.length) return;
  const rowH = 28;
  const labelW = 160;
  const chartW = 1100;
  const totalW = labelW + chartW + 20;
  const maxX = Math.max(schedule.totalCycleTime, schedule.takt) * 1.05 || 1;
  const scale = chartW / maxX;
  const tickEvery = 20;
  const totalH = 26 + steps.length * rowH + 10;

  const c = document.createElement("canvas");
  c.width = totalW * 2; c.height = totalH * 2;
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, totalW, totalH);
  ctx.font = "11px system-ui";

  // axis
  for (let t = 0; t <= maxX; t += tickEvery) {
    const tx = labelW + t * scale;
    const isMajor = t % (tickEvery * 2) === 0;
    ctx.strokeStyle = isMajor ? "#CFD5E2" : "#E2E6EF"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, 26); ctx.lineTo(tx, 26 + steps.length * rowH); ctx.stroke();
    if (isMajor) { ctx.fillStyle = "#5B6274"; ctx.fillText(`${t}s`, tx + 3, 18); }
  }

  // takt
  const ttx = labelW + schedule.takt * scale;
  ctx.strokeStyle = "#E11D2E"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ttx, 0); ctx.lineTo(ttx, 26 + steps.length * rowH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#E11D2E"; ctx.font = "bold 10px system-ui"; ctx.fillText(`TAKT ${schedule.takt}s`, ttx + 3, 12);
  ctx.font = "11px system-ui";

  steps.forEach((s, i) => {
    const ry = 26 + i * rowH;
    ctx.fillStyle = "#0B1020";
    ctx.fillText(`${String(i+1).padStart(2,"0")} ${s.name}`, 6, ry + rowH / 2 + 4);
    if (s.setupTime > 0) {
      ctx.fillStyle = "#6D28D9";
      ctx.fillRect(labelW + s.startTime * scale, ry + 5, s.setupTime * scale, rowH - 10);
    }
    if (s.machineTime > 0) {
      ctx.fillStyle = s.bottleneck ? "#E11D2E" : "#1E40AF";
      ctx.fillRect(labelW + (s.startTime + s.setupTime) * scale, ry + 5, s.machineTime * scale, rowH - 10);
    }
    if (s.operatorTime > 0) {
      ctx.fillStyle = "#06B6D4";
      ctx.fillRect(labelW + (s.startTime + s.setupTime + s.machineTime) * scale, ry + 5, s.operatorTime * scale, rowH - 10);
    }
  });

  c.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

function escapeXml(s) { return String(s).replace(/[<>&"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;"}[c])); }
