import { NextResponse } from "next/server";

// CSV per Excel italiano: separatore ";", BOM UTF-8 e protezione contro le
// formule iniettate (una cella che inizia con = + - @ Excel la eseguirebbe).

// Prefixes formula-trigger characters to prevent CSV injection in Excel/Sheets.
// Tabs and carriage returns are checked on the raw string; other triggers (=+-@) are
// checked after trimming spaces so that " =cmd" is also caught.
export function sanitizeCsvValue(s: string): string {
  const trimmed = s.trimStart();
  if (/^[\t\r]/.test(s) || /^[=+\-@]/.test(trimmed)) return `'${s}`;
  return s;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${sanitizeCsvValue(s).replace(/"/g, '""')}"`;
    })
    .join(";");
}

export function csvResponse(rows: string[], filename: string): NextResponse {
  const bom = "﻿"; // BOM for Excel UTF-8
  const content = bom + rows.join("\r\n");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
