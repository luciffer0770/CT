export async function importStepsFromFile(file) {
  const m = await import("./excel.js");
  return m.importStepsFromFile(file);
}
export async function analyzeImportFile(file) {
  const m = await import("./excel.js");
  return m.analyzeImportFile(file);
}
export async function importStepsFromMapping(buffer, mapping, fileName) {
  const m = await import("./excel.js");
  return m.importStepsFromMapping(buffer, mapping, fileName);
}
export async function exportStepsToExcel(steps, schedule, filename) {
  const m = await import("./excel.js");
  return m.exportStepsToExcel(steps, schedule, filename);
}
export async function downloadTemplate() {
  const m = await import("./excel.js");
  return m.downloadTemplate();
}
export async function loadLogicalFields() {
  const m = await import("./excel.js");
  return m.LOGICAL_FIELDS;
}
