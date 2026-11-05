import { format as formatDate } from "date-fns";

import { hasKey, isBlankLabel, toChartNumber, valueAt } from "@/lib/dashboard-charts";
import { toCalendarDay, toDateValue, type LabelValue } from "@/lib/dashboard-data";

// Pure drill-down aggregation for DrillBreakdown: one level of a hierarchy
// (Region > Country > City, Year > Month > Day) rolled up on the client from
// rows already loaded, so drilling never issues another query. Sums and counts
// roll up; an average, rate or percentile does not, so never drill those.

export type DrillLevel = {
  // Row field this level groups by; a dotted or bracketed path
  // ("address.city") reads a nested field, as on the other charts.
  key: string;
  // Level name shown to the user ("Region", "Month").
  label: string;
  // The field is a date: bucket it by calendar year, month or day, in order.
  // A date-only "2026-03-02" is that day; a timestamp is an instant booked on
  // the viewer's local day, unless DrillBreakdown's `dayBins` says the field
  // holds day bins (a Kusto or SQL `bin(…, 1d)`), read as that calendar day
  // (`toCalendarDay`), as on TrendChart. A whole number of 4, 6 or 8 digits
  // is a YYYY, YYYYMM or YYYYMMDD period key here, not the Excel serial
  // TrendChart reads it as. Only ISO year, month and week spellings count as
  // coarse; another month spelling ("Mar 2025") parses as its first day.
  time?: "year" | "month" | "day";
};

export type DrillView = {
  data: LabelValue[];
  // Time levels keep chronological order; other levels rank by value.
  ordered: boolean;
  // Rows left out at this level: no date, or no numeric value.
  skipped: number;
};

export const DRILL_BLANK_LABEL = "(Blank)";

type Bucket = { label: string; order: number };

function isObjectCell(value: unknown): boolean {
  return value !== null && typeof value === "object" && !(value instanceof Date);
}

function bucket(row: Record<string, unknown>, level: DrillLevel, dayBins = false): Bucket | null {
  const cell = valueAt(row, level.key);
  if (!level.time) {
    const raw = cell;
    // An object cell has no category of its own; skip it rather than merge
    // every one into "[object Object]", and before the blank check stringifies
    // it (a JSON `{"toString": null}` throws there).
    if (isObjectCell(raw)) return null;
    if (isBlankLabel(raw)) return { label: DRILL_BLANK_LABEL, order: 0 };
    const label = String(raw).trim();
    // A real category spelled "(Blank)" must not merge with missing values;
    // quoting every quote-wrapped spelling keeps "(Blank)" and ""(Blank)"" apart.
    return { label: /^"*\(Blank\)"*$/.test(label) ? `"${label}"` : label, order: 0 };
  }
  // A whole number shaped like a year (2025), YYYYMM (202503) or YYYYMMDD
  // (20250302) is a warehouse period key, not an Excel serial or epoch time,
  // so read it as its digits, the same as the string form.
  const raw =
    typeof cell === "number" && Number.isInteger(cell) && /^(\d{4}|\d{6}|\d{8})$/.test(String(cell))
      ? String(cell)
      : cell;
  if (typeof raw !== "string" && typeof raw !== "number" && !(raw instanceof Date)) {
    return null;
  }
  // A year ("2025", "+002025"), month ("2025-03", "202503") or week ("2025-W10")
  // string names no finer period; parsed, it would invent a January, a
  // first-of-month or a Monday bucket. A week string's year is its ISO
  // week-year (2026-W01 starts on Dec 29, 2025), so take it from the text.
  // Only a week-only string takes its week-year: a week date with a weekday
  // ("2026-W01-1") names a calendar day, so it goes under that day's calendar
  // year (2025) to sit above its own Month and Day buckets.
  if (typeof raw === "string") {
    const text = raw.trim();
    if (/^(?:[+-]\d{2})?\d{4}$/.test(text) && level.time !== "year") return null;
    const monthText = /^(?:[+-]\d{2})?\d{4}-?\d{2}$/.test(text);
    if (monthText && level.time === "day") return null;
    const week = /^([+-]\d{2})?(\d{4})-?W\d{2}$/i.exec(text);
    if (week) {
      if (level.time !== "year" || !toDateValue(text)) return null;
      const weekYear = Number((week[1] ?? "") + week[2]);
      return { label: String(weekYear), order: weekYear };
    }
  }
  const day = dayBins ? toCalendarDay(raw) : toDateValue(raw);
  if (!day) return null;
  const year = day.getFullYear();
  const month = day.getMonth();
  if (level.time === "year") return { label: String(year), order: year };
  if (level.time === "month") {
    return { label: formatDate(day, "MMM yyyy"), order: year * 100 + month };
  }
  return {
    label: formatDate(day, "MMM d, yyyy"),
    order: (year * 100 + month) * 100 + day.getDate(),
  };
}

// Levels whose key looks misnamed: a key no row carries (which would otherwise
// draw one "(Blank)" category bar), or a level whose values give no row a
// usable date or category (object cells). A date key present but empty in every
// row (an optional date) is not misnamed; drilling into it only warns. Nor is a
// date field too coarse for the level (year-only values under Month): it holds
// dates, so drilling into it only warns. The top
// level's unusable values are left to the component's own all-skipped check.
export function misnamedLevels(
  rows: Record<string, unknown>[],
  levels: DrillLevel[],
  dayBins = false,
): DrillLevel[] {
  if (rows.length === 0) return [];
  return levels.filter((level, i) => {
    if (!hasKey(rows, level.key)) return !level.time || i > 0;
    const coarse = level.time ? { ...level, time: "year" as const } : null;
    return (
      i > 0 &&
      !rows.some((row) => bucket(row, level, dayBins)) &&
      !(coarse && rows.some((row) => bucket(row, coarse, dayBins))) &&
      rows.some((row) => {
        const cell = valueAt(row, level.key);
        return isObjectCell(cell) || !isBlankLabel(cell);
      })
    );
  });
}

// The bars for the level below `path` (one selected label per level above).
// `value` names the numeric field to sum; omit it to count rows.
export function drillLevel(
  rows: Record<string, unknown>[],
  levels: DrillLevel[],
  path: string[],
  value?: string,
  dayBins = false,
): DrillView {
  const depth = Math.min(path.length, levels.length - 1);
  const level = levels[depth];
  if (!level) return { data: [], ordered: false, skipped: 0 };
  const totals = new Map<string, { value: number; order: number }>();
  let skipped = 0;
  for (const row of rows) {
    let inPath = true;
    for (let i = 0; i < depth; i++) {
      if (bucket(row, levels[i], dayBins)?.label !== path[i]) {
        inPath = false;
        break;
      }
    }
    if (!inPath) continue;
    const b = bucket(row, level, dayBins);
    const v = value === undefined ? 1 : toChartNumber(valueAt(row, value));
    if (!b || v === null) {
      skipped++;
      continue;
    }
    const prev = totals.get(b.label);
    totals.set(b.label, { value: (prev?.value ?? 0) + v, order: b.order });
  }
  const ordered = level.time !== undefined;
  const data = Array.from(totals, ([label, t]) => ({ label, ...t }))
    .sort((a, b) => (ordered ? a.order - b.order : b.value - a.value))
    .map(({ label, value: total }) => ({ label, value: total }));
  return { data, ordered, skipped };
}
