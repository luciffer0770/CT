// Lazy facade so the jsPDF + autotable chunk only loads on demand.
export async function exportReportToPDF(args) {
  const m = await import("./pdf.js");
  return m.exportReportToPDF(args);
}
export async function exportKPIsToPDF(args) {
  const m = await import("./pdf.js");
  return m.exportKPIsToPDF(args);
}
export async function exportGanttSVG(schedule, filename) {
  const m = await import("./pdf.js");
  return m.exportGanttSVG(schedule, filename);
}
export async function exportGanttPNG(schedule, filename) {
  const m = await import("./pdf.js");
  return m.exportGanttPNG(schedule, filename);
}
