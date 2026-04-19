export async function importStepsFromFile(file) {
  const m = await import("./excel.js");
  return m.importStepsFromFile(file);
}
export async function exportStepsToExcel(steps, schedule, filename) {
  const m = await import("./excel.js");
  return m.exportStepsToExcel(steps, schedule, filename);
}
export async function downloadTemplate() {
  const m = await import("./excel.js");
  return m.downloadTemplate();
}
