/** Minimal RFC 4180 CSV parsing and writing for the developer batch scripts. */

/** Parses CSV text into records keyed by the header row. Supports quoted fields with commas, quotes and newlines. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let isQuoted = false;
  const source = text.replace(/^﻿/, "");

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (isQuoted) {
      if (ch === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        isQuoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      isQuoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (!header) return [];
  return body.map((cells) => Object.fromEntries(header.map((name, index) => [name.trim(), (cells[index] ?? "").trim()])));
}

/** Serializes records as CSV with the given column order. */
export function writeCsv(columns: string[], records: Record<string, string | number>[]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.join(",")];
  for (const record of records) {
    lines.push(columns.map((column) => escape(record[column] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}
