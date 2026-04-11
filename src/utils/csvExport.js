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
  return safeBase.toLowerCase().endsWith(".csv") ? safeBase : `${safeBase}.csv`;
};

const normalizeDateTime = (value) => {
  if (!value) return "";
  if (typeof value.toDate === "function") {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value.toDate());
  }

  if (value instanceof Date) {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
    }
  }

  return "";
};

const serializeCsvValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => serializeCsvValue(item)).filter(Boolean).join(" | ");
  }

  const formattedDate = normalizeDateTime(value);
  if (formattedDate) return formattedDate;

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${serializeCsvValue(item)}`)
      .filter(Boolean)
      .join(" | ");
  }

  return String(value);
};

const escapeCsvCell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

const normalizeColumns = (columns = []) =>
  columns.map((column) =>
    typeof column === "string"
      ? { key: column, label: column }
      : {
          key: column.key,
          label: column.label || column.key,
        },
  );

export const downloadCsvFile = ({ fileName, columns, rows }) => {
  if (typeof window === "undefined") return;

  const normalizedColumns = normalizeColumns(columns);
  if (normalizedColumns.length === 0) return;

  const headerRow = normalizedColumns.map((column) => escapeCsvCell(column.label)).join(",");
  const dataRows = (rows || []).map((row) =>
    normalizedColumns
      .map((column) => escapeCsvCell(serializeCsvValue(row?.[column.key])))
      .join(","),
  );

  const csvText = `\uFEFF${[headerRow, ...dataRows].join("\r\n")}`;
  const blob = new Blob([csvText], {
    type: "text/csv;charset=utf-8;",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = normalizeFileName(fileName);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
