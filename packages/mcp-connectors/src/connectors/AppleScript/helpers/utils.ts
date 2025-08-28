// Extracted utility helpers from applescript.ts (no logic changes)
import path from "node:path";
import fs from "node:fs";

export function sanitizeShellString(str: string): string {
  return str.replace(/[\\$`\"]/g, "\\$&");
}

export function escAS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function asMonthName(monthNumber: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[Math.max(0, Math.min(11, monthNumber - 1))] as string;
}

export function parseFlexibleDateTime(
  input: string
):
  | {
      y: number;
      m: number;
      d: number;
      hh: number;
      mm: number;
      ss: number;
      allDay: boolean;
    }
  | null {
  // Accept: YYYY-MM-DD, YYYY-MM-DD HH:MM, YYYY-MM-DDTHH:MM[:SS][Z|+HH:MM|-HH:MM]
  const re =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:([Z])|([+-])(\d{2}):?(\d{2}))?)?$/;
  const m = input.match(re);
  if (!m) return null;
  const y = parseInt(m[1] || "0", 10);
  const mon = parseInt(m[2] || "0", 10);
  const d = parseInt(m[3] || "0", 10);
  if (!m[4]) {
    // All-day
    return { y, m: mon, d, hh: 0, mm: 0, ss: 0, allDay: true };
  }
  const hh = parseInt(m[4] || "0", 10);
  const mm = parseInt(m[5] || "0", 10);
  const ss = m[6] ? parseInt(m[6] || "0", 10) : 0;
  // Timezone handling
  if (m[7] === "Z" || m[8]) {
    // Build a Date in UTC and then convert to local components
    const sign = m[8] === "-" ? -1 : 1;
    const offH = m[9] ? parseInt(m[9], 10) : 0;
    const offM = m[10] ? parseInt(m[10], 10) : 0;
    const offsetMinutes = m[7] === "Z" ? 0 : sign * (offH * 60 + offM);
    const utcMs = Date.UTC(y, mon - 1, d, hh, mm, ss);
    const localMs = utcMs - offsetMinutes * 60_000;
    const dt = new Date(localMs);
    return {
      y: dt.getFullYear(),
      m: dt.getMonth() + 1,
      d: dt.getDate(),
      hh: dt.getHours(),
      mm: dt.getMinutes(),
      ss: dt.getSeconds(),
      allDay: false,
    };
  }
  return { y, m: mon, d, hh, mm, ss, allDay: false };
}

export function buildASDateFromComponents(
  varName: string,
  c: { y: number; m: number; d: number; hh: number; mm: number; ss?: number }
): string {
  const monthName = asMonthName(c.m);
  const seconds = c.ss ?? 0;
  return `
set ${varName} to current date
set year of ${varName} to ${c.y}
set month of ${varName} to ${monthName}
set day of ${varName} to ${c.d}
set hours of ${varName} to ${c.hh}
set minutes of ${varName} to ${c.mm}
set seconds of ${varName} to ${seconds}
`;
}

export function dateTimeToAS(dtStr: string, varName = "_dt"): string {
  const parsed = parseFlexibleDateTime(dtStr);
  if (!parsed) {
    // Fallback minimal: set to current date to avoid crashing
    return `set ${varName} to current date`;
  }
  return buildASDateFromComponents(varName, parsed);
}

export function toASList(values: string[]) {
  return `{${values.map((v) => `"${escAS(v)}"`).join(", ")}}`;
}

export function toAS2DList(rows: string[][]) {
  const rs = rows.map((r) => `{${r.map((v) => `"${escAS(v)}"`).join(", ")}}`);
  return `{${rs.join(", ")}}`;
}

export function ok(data: any, meta?: any) {
  return JSON.stringify({ ok: true, data, meta });
}

export function fail(message: string, meta?: any) {
  return JSON.stringify({ ok: false, error: message, meta });
}

// Path security helpers
export function isPathAllowed(
  requestedPath: string,
  allowedPaths: string[] = [],
  blockedPaths: string[] = []
): boolean {
  const resolved = path.resolve(String(requestedPath));
  if (blockedPaths?.some((bp) => resolved.startsWith(path.resolve(String(bp)))))
    return false;
  if (!allowedPaths?.length) return true;
  return allowedPaths.some((ap) =>
    resolved.startsWith(path.resolve(String(ap)))
  );
}

export function chooseExistingRootAndSegments(fullPath: string): {
  root: string;
  segments: string[];
} {
  const parts = path.resolve(fullPath).split("/").filter(Boolean);
  let root = "/";
  const segments: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const testPath = "/" + parts.slice(0, i + 1).join("/");
    if (fs.existsSync(testPath)) {
      root = testPath;
    } else {
      segments.push(...parts.slice(i));
      break;
    }
  }
  return { root, segments };
}
