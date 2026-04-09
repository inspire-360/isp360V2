const WORKBOOK_XMLNS = "urn:schemas-microsoft-com:office:spreadsheet";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeSheetName = (name, fallback) => {
  const cleaned = String(name || fallback || "Sheet")
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || fallback || "Sheet").slice(0, 31);
};

const normalizeFileName = (fileName) => {
  const base = [...String(fileName || "inspire-export")]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 32) return "-";
      if (/[<>:"/\\|?*]/.test(character)) return "-";
      return character;
    })
    .join("")
    .replace(/\s+/g, "-")
    .trim();

  const safeBase = base || "inspire-export";
  return safeBase.toLowerCase().endsWith(".xls") ? safeBase : `${safeBase}.xls`;
};

const formatCellValue = (value) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
};

const getCellType = (value) => {
  const normalized = formatCellValue(value);
  return typeof normalized === "number" && Number.isFinite(normalized) ? "Number" : "String";
};

const buildCellXml = (value, styleId = "") => {
  const normalized = formatCellValue(value);
  const type = getCellType(value);
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";

  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(normalized)}</Data></Cell>`;
};

const buildWorksheetXml = (sheet, index) => {
  const columns =
    sheet.columns?.length > 0
      ? sheet.columns
      : [...new Set((sheet.rows || []).flatMap((row) => Object.keys(row || {})))];

  const headerRow = `<Row>${columns.map((column) => buildCellXml(column, "header")).join("")}</Row>`;
  const bodyRows = (sheet.rows || [])
    .map(
      (row) =>
        `<Row>${columns.map((column) => buildCellXml(row?.[column], "cell")).join("")}</Row>`,
    )
    .join("");

  return `
    <Worksheet ss:Name="${escapeXml(normalizeSheetName(sheet.name, `Sheet ${index + 1}`))}">
      <Table>
        ${headerRow}
        ${bodyRows}
      </Table>
    </Worksheet>`;
};

export const downloadExcelWorkbook = ({ fileName, sheets }) => {
  if (typeof window === "undefined" || !Array.isArray(sheets) || sheets.length === 0) return;

  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="${WORKBOOK_XMLNS}"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="${WORKBOOK_XMLNS}"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#EAF0FF" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
    </Style>
    <Style ss:ID="cell">
      <Alignment ss:Vertical="Top" ss:WrapText="1" />
    </Style>
  </Styles>
  ${sheets.map((sheet, index) => buildWorksheetXml(sheet, index)).join("")}
</Workbook>`;

  const blob = new Blob([workbookXml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = normalizeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
