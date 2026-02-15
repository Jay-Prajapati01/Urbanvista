/**
 * CSV Export Utility — converts data to CSV and triggers browser download
 */

type Row = Record<string, string | number | boolean | null | undefined>;

interface CsvColumn {
  header: string;
  key: string;
  format?: (value: unknown, row: Row) => string;
}

export function exportToCsv(
  filename: string,
  data: Row[],
  columns: CsvColumn[]
) {
  if (data.length === 0) return;

  const escapeCell = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerRow = columns.map((col) => escapeCell(col.header)).join(",");

  const rows = data.map((item) =>
    columns
      .map((col) => {
        if (col.format) {
          return escapeCell(String(col.format(item[col.key], item)));
        }
        const val = item[col.key];
        if (val === null || val === undefined) return "";
        return escapeCell(String(val));
      })
      .join(",")
  );

  const csvContent = [headerRow, ...rows].join("\n");

  // BOM for Excel to recognize UTF-8
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
