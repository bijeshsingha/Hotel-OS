export type ReportCell = string | number | null | undefined;
export type ReportTable = { title: string; property: string; period: string; headers: string[]; rows: ReportCell[][] };

/** Legacy CSV consumers must use UTF-8 BOM and RFC 4180 quoting for Excel. */
export function reportCsv(headers: string[], rows: ReportCell[][]): string {
  const cell = (value: ReportCell) => {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
}

/** Real XLSX preserves Unicode, identifiers as text, and amounts as numeric cells. */
export async function reportWorkbook(table: ReportTable): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ROVESTA";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 5 }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const width = table.headers.length;
  [table.title, table.property, `${table.period} | ${table.rows.length} matching records`].forEach((text, index) => {
    sheet.mergeCells(index + 1, 1, index + 1, width);
    const cell = sheet.getCell(index + 1, 1);
    cell.value = text;
    cell.font = { name: "Calibri", size: index ? 11 : 16, bold: index === 0 };
  });
  sheet.addRow([]);
  const header = sheet.addRow(table.headers);
  header.height = 34;
  header.eachCell(cell => {
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18304B" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  for (const values of table.rows) {
    if (values.length !== width) throw new Error("Report columns do not match the exported record.");
    const row = sheet.addRow(values.map(value => value == null ? "" : typeof value === "number" && !Number.isFinite(value) ? "" : value));
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.numFmt = typeof cell.value === "number" ? (/INR|Amount|Tariff|Balance|Charges|GST/.test(table.headers[col - 1]) && !/Rate \(%\)/.test(table.headers[col - 1]) ? '#,##0.00;[Red](#,##0.00);"–"' : "0.##") : "@";
      if (row.number % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
    });
  }
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, sheet.rowCount), column: width } };
  sheet.columns.forEach((column, index) => {
    const samples = table.rows.slice(0, 100).map(row => String(row[index] ?? "").length);
    column.width = Math.min(44, Math.max(14, table.headers[index].length * 0.85, ...samples.map(n => n * 0.85)));
  });
  sheet.pageSetup.printTitlesRow = "1:5";
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function downloadReportExcel(table: ReportTable, filename: string): Promise<void> {
  const bytes = await reportWorkbook(table);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.(csv|xlsx)$/i, "") + ".xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
