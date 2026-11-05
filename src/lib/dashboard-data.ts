import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  endOfDay,
  format as formatDate,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

// Pure data helpers for dashboards: formatting, aggregation, time bucketing and
// date ranges. No React here, so pages, hooks and tests can all share them.

export type MetricFormat =
  "number" | "compact" | "currency" | "percent" | "duration";

export type DateRange = { from: Date; to: Date };

export type DateRangePreset = { label: string; range: () => DateRange };

export type TimeGrain = "day" | "week" | "month" | "quarter";

export type LabelValue = { label: string; value: number };

const EMPTY_METRIC = "—";
const DEFAULT_CURRENCY = "USD";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(undefined, options);
  } catch {
    // An invalid currency code throws RangeError; fall back to a plain number.
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  }
}

const DURATION_UNITS: { unit: string; ms: number; next: number }[] = [
  { unit: "ms", ms: 1, next: 1000 },
  { unit: "s", ms: 1000, next: 60 },
  { unit: "min", ms: 60_000, next: 60 },
  { unit: "h", ms: 3_600_000, next: Number.POSITIVE_INFINITY },
];

// The value as it will be displayed: whole numbers from 100 up, else one decimal.
function roundForDisplay(v: number): number {
  return Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
}

// Milliseconds as the largest readable unit: 655 -> "655 ms", 10900 -> "10.9 s",
// 150000 -> "2.5 min", 7200000 -> "2 h". The unit is chosen after rounding, so
// 999.6 ms reads "1 s", never "1,000 ms".
function formatDuration(ms: number): string {
  for (const { unit, ms: size, next } of DURATION_UNITS) {
    const shown = roundForDisplay(ms / size);
    if (Math.abs(shown) < next) {
      return `${numberFormat({ maximumFractionDigits: 1 }).format(shown)} ${unit}`;
    }
  }
  return EMPTY_METRIC;
}

// Intl accepts 0-20 fraction digits; anything else falls back to the default.
function fractionDigits(digits: number | undefined, fallback: number): number {
  return digits !== undefined && Number.isInteger(digits) && digits >= 0 && digits <= 20
    ? digits
    : fallback;
}

// Formats a metric for display. `percent` takes a ratio (0.12 -> "12%",
// 0.0195 -> "1.95%": under 10% keeps two decimals, so a small rate is not
// rounded to a whole point); `duration` takes milliseconds (10900 -> "10.9 s").
// `digits` caps the fraction digits of `number` and `percent`, for a value the
// query already rounded (`round(x, 2)` -> digits 2).
// null, undefined, NaN and Infinity render as an em dash.
export function formatMetric(
  value: number | null | undefined,
  format: MetricFormat = "number",
  currency: string = DEFAULT_CURRENCY,
  digits?: number,
): string {
  if (!isFiniteNumber(value)) return EMPTY_METRIC;
  const abs = Math.abs(value);
  switch (format) {
    case "compact":
      return numberFormat({
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    case "currency": {
      const digits = abs >= 1000 ? 0 : 2;
      return numberFormat({
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
    }
    case "percent":
      return numberFormat({
        style: "percent",
        maximumFractionDigits: fractionDigits(digits, abs < 0.1 ? 2 : 1),
      }).format(value);
    case "duration":
      return formatDuration(value);
    default:
      return numberFormat({
        maximumFractionDigits: fractionDigits(digits, abs >= 1000 ? 0 : 2),
      }).format(value);
  }
}

// The label a multi-value filter shows: `allLabel` when nothing or every
// option is chosen, the option's own label for one, else "2 of 4" — never a
// subset that reads as the whole list.
export function multiSelectSummary(
  selected: readonly string[],
  options: readonly { value: string; label: string }[],
  allLabel = "All",
): string {
  const chosen = options.filter((option) => selected.includes(option.value));
  if (chosen.length === 0 || chosen.length === options.length) return allLabel;
  if (chosen.length === 1) return chosen[0].label;
  return `${chosen.length} of ${options.length}`;
}

// Short form for chart axis ticks: large numbers and currency go compact.
export function formatAxisValue(
  value: number | null | undefined,
  format: MetricFormat = "number",
  currency: string = DEFAULT_CURRENCY,
): string {
  if (!isFiniteNumber(value)) return EMPTY_METRIC;
  // A zero tick has no unit worth showing; "0 ms" beside "139 h" reads as a mismatch.
  if (format === "duration" && value === 0) return "0";
  if (format === "percent" || format === "duration")
    return formatMetric(value, format);
  if (format === "currency") {
    return numberFormat({
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return Math.abs(value) >= 10000
    ? formatMetric(value, "compact")
    : formatMetric(value, "number");
}

// Signed percent for a change ratio: 0.123 -> "+12.3%", -0.04 -> "-4%".
export function formatPercentChange(change: number | null | undefined): string {
  if (!isFiniteNumber(change)) return EMPTY_METRIC;
  return numberFormat({
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(change);
}

// Change from `previous` to `current` as a ratio (0.12 = +12%). null when
// either side is missing or `previous` is 0 (the change is undefined).
export function percentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous === 0) {
    return null;
  }
  const change = (current - previous) / Math.abs(previous);
  return Number.isFinite(change) ? change : null;
}

// `current` as a share of `target` (0.82 = 82% of the target). null when
// either side is missing or `target` is 0 or negative, where a share of it
// means nothing.
export function targetAttainment(
  current: number | null | undefined,
  target: number | null | undefined,
): number | null {
  if (!isFiniteNumber(current) || !isFiniteNumber(target) || target <= 0) {
    return null;
  }
  const share = current / target;
  return Number.isFinite(share) ? share : null;
}

// Whether `current` meets `target`: at or above it when up is good, at or
// below it when down is good. "none" when either side is missing.
export function targetStatus(
  current: number | null | undefined,
  target: number | null | undefined,
  goodDirection: "up" | "down" = "up",
): "on" | "off" | "none" {
  if (!isFiniteNumber(current) || !isFiniteNumber(target)) return "none";
  const met = goodDirection === "down" ? current <= target : current >= target;
  return met ? "on" : "off";
}

function byValueDesc(a: LabelValue, b: LabelValue): number {
  return b.value - a.value || a.label.localeCompare(b.label);
}

// Sums `value` per `key`, largest first. Non-finite values are skipped.
export function groupSum<T>(
  rows: T[],
  key: (r: T) => string,
  value: (r: T) => number,
): LabelValue[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const v = value(row);
    if (!isFiniteNumber(v)) continue;
    const k = key(row);
    totals.set(k, (totals.get(k) ?? 0) + v);
  }
  return Array.from(totals, ([label, total]) => ({ label, value: total })).sort(
    byValueDesc,
  );
}

// Date | ISO string | Excel serial | epoch milliseconds -> a valid Date, or
// null when missing or unparseable.
// - Date-only strings ("2026-03-01") are read as LOCAL midnight, not UTC.
// - Excel returns date cells as serial day numbers, often as strings
//   ("45678.5"); a number up to the last Excel day (9999-12-31) is a serial and
//   is never parsed as a year. A five-digit string is a serial (10000 is
//   1927-05-18), so "2026" stays the year 2026; a six- or seven-digit string is
//   a serial only when it is not an ISO basic date ("202603" is March 2026,
//   "2026060" is day 60 of 2026).
// - A larger number is epoch milliseconds (TanStack Query's `dataUpdatedAt`).
const EXCEL_SERIAL_RX = /^\d{5}(\.\d+)?$/;
const LONG_EXCEL_SERIAL_RX = /^\d{6,7}(\.\d+)?$/;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const EXCEL_MAX_SERIAL = 2_958_465;
const ISO_SHAPED_RX =
  /^[+-]?\d{4,6}-\d{2}(?:-\d{2})?(?:[T ]\d{2}(?::\d{2}(?::\d{2}(?:[.,]\d+)?)?)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const ISO_DATE_PREFIX_RX = /^([+-]?\d{4,6}-\d{2}-\d{2})(?![\d-])/;

function fromExcelSerial(serial: number): Date | null {
  if (serial <= 0 || serial > EXCEL_MAX_SERIAL + 1) return null;
  // Excel counts 1900-02-29, a day that never existed, so serials before it
  // (1 = 1900-01-01) sit one day later than the 1899-12-30 epoch reads them.
  const days = serial < 61 ? serial + 1 : serial;
  // Round to the millisecond first, so float noise just under midnight
  // (46000.99999999999) still reads as the next day; then to the second, but
  // never past the serial's own day: 23:59:59.9 stays on that day.
  const ms = Math.round(days * 86_400_000);
  const nextMidnight = (Math.floor(days) + 1) * 86_400;
  const seconds =
    ms >= nextMidnight * 1000
      ? nextMidnight
      : Math.min(Math.round(ms / 1000), nextMidnight - 1);
  const utc = new Date(EXCEL_EPOCH_MS + seconds * 1000);
  // Serials carry wall-clock time with no zone: read them as local time.
  const local = new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds(),
  );
  return isValid(local) ? local : null;
}

export function toDateValue(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value <= EXCEL_MAX_SERIAL + 1) return fromExcelSerial(value);
    const epoch = new Date(value);
    return isValid(epoch) ? epoch : null;
  }
  const text = value.trim();
  if (!text) return null;
  if (EXCEL_SERIAL_RX.test(text)) return fromExcelSerial(Number(text));
  const parsed = parseISO(text);
  if (isValid(parsed)) return parsed;
  if (LONG_EXCEL_SERIAL_RX.test(text)) return fromExcelSerial(Number(text));
  // A wholly ISO-shaped string parseISO refused ("2026-02-30"), or one whose
  // leading ISO date is impossible ("2026-02-30 10:00 UTC"), is invalid; the
  // engine's lenient parser would roll it into another day. Other shapes
  // ("2026-03-01 12:30:00 UTC") still reach that parser.
  if (ISO_SHAPED_RX.test(text)) return null;
  const datePrefix = ISO_DATE_PREFIX_RX.exec(text);
  if (datePrefix && !isValid(parseISO(datePrefix[1]))) return null;
  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

function isUtcMidnight(value: Date): boolean {
  return (
    isValid(value) &&
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

// `toDateValue`, except that a value at exactly UTC midnight (how Kusto and SQL
// return a day bin, in any form `toDateValue` reads) is read as that local
// calendar day. Converting the instant would put that day bin on Feb 28 for
// every viewer west of UTC. Only for values known to be day bins: an hourly row
// at 00:00Z is an instant.
export function toCalendarDay(
  value: Date | string | number | null | undefined,
): Date | null {
  const date = toDateValue(value);
  if (!date || !isUtcMidnight(date)) return date;
  // setFullYear, not the Date constructor, which reads years 0-99 as 19xx.
  const day = new Date(0);
  day.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  day.setHours(0, 0, 0, 0);
  return day;
}

// Formats a date-only value (a Dataverse DateOnly column, a CSV or Excel date,
// a Kusto or SQL day bin) for a table cell, tooltip or label as the calendar
// day it names. `new Date("2025-07-09")` is UTC midnight, which every viewer
// west of UTC sees as Jul 8; this reads it as Jul 9 everywhere. Returns
// `empty` when the value is missing or not a date. Not for instants with a
// time of day: format those with `toDateValue`.
export function formatCalendarDay(
  value: Date | string | number | null | undefined,
  pattern = "MMM d, yyyy",
  empty = "",
): string {
  const day = toCalendarDay(value);
  return day ? formatDate(day, pattern) : empty;
}

function bucketStart(date: Date, grain: TimeGrain): Date {
  switch (grain) {
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    default:
      return startOfDay(date);
  }
}

function nextBucket(date: Date, grain: TimeGrain): Date {
  switch (grain) {
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
    case "quarter":
      return addQuarters(date, 1);
    default:
      return addDays(date, 1);
  }
}

// Sums `value` per time bucket (weeks start Monday), oldest first. Every bucket
// between the first and last row is present and empty ones are 0, unless that
// span would exceed `maxBuckets` (one stray sentinel date such as 1900-01-01
// would otherwise fill a century of days): then only the buckets that hold rows
// are returned. The cap bounds the allocation, so a non-finite `maxBuckets`
// keeps the default. `bucket` is the bucket's start date as "yyyy-MM-dd" (local
// time). Pass `dayBins` for a calendar-binned column (`bin(…, 1d)`,
// `bin(…, 7d)`, `startofday`/`startofweek`/`startofmonth`), as to `inRange`, so
// a UTC-midnight bin lands on its calendar day (`toCalendarDay`);
// without it each date is an instant, as an hourly row is. Rows with an invalid
// date or non-finite value are skipped.
export const MAX_TIME_BUCKETS = 1000;

export function bucketByTime<T>(
  rows: T[],
  date: (r: T) => Date | string | number,
  grain: TimeGrain,
  value: (r: T) => number,
  dayBins = false,
  maxBuckets: number = MAX_TIME_BUCKETS,
): { bucket: string; value: number }[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const d = dayBins ? toCalendarDay(date(row)) : toDateValue(date(row));
    const v = value(row);
    if (!d || !isFiniteNumber(v)) continue;
    const start = bucketStart(d, grain).getTime();
    totals.set(start, (totals.get(start) ?? 0) + v);
  }
  if (totals.size === 0) return [];
  const keys = Array.from(totals.keys()).sort((a, b) => a - b);
  const cap = Number.isFinite(maxBuckets)
    ? Math.max(1, Math.floor(maxBuckets))
    : MAX_TIME_BUCKETS;
  const first = keys[0];
  const last = keys[keys.length - 1];
  const out: { bucket: string; value: number }[] = [];
  for (
    let cursor = new Date(first);
    cursor.getTime() <= last;
    cursor = bucketStart(nextBucket(cursor, grain), grain)
  ) {
    if (out.length >= cap) {
      console.warn(
        `bucketByTime: the rows span more than ${cap} ${grain} buckets; returning only the ${keys.length} buckets that hold rows`,
      );
      return keys.map((key) => ({
        bucket: formatDate(new Date(key), "yyyy-MM-dd"),
        value: totals.get(key) ?? 0,
      }));
    }
    out.push({
      bucket: formatDate(cursor, "yyyy-MM-dd"),
      value: totals.get(cursor.getTime()) ?? 0,
    });
  }
  return out;
}

// True when `d` falls on any day from `range.from` through `range.to`
// (whole days, inclusive; a reversed range is read the right way round). Pass
// `dayBins` for a calendar-binned column (as to `bucketByTime`), so a
// UTC-midnight bin is filtered on
// the calendar day its label shows (`toCalendarDay`); without it `d` is an
// instant, as an hourly row is.
export function inRange(
  d: Date | string | number,
  range: DateRange,
  dayBins = false,
): boolean {
  const date = dayBins ? toCalendarDay(d) : toDateValue(d);
  if (!date || !isValid(range.from) || !isValid(range.to)) return false;
  const [lo, hi] =
    range.from.getTime() <= range.to.getTime()
      ? [range.from, range.to]
      : [range.to, range.from];
  const t = date.getTime();
  return t >= startOfDay(lo).getTime() && t <= endOfDay(hi).getTime();
}

// Infinity keeps every item; NaN keeps one.
function clampCount(n: number): number {
  return Number.isNaN(n) ? 1 : Math.max(1, Math.floor(n));
}

// Largest first, at most `n` items in total: when there are more, the top
// n-1 are kept and the rest are summed into one `otherLabel` item. A source
// category already named `otherLabel` is summed into that same item, so the
// chart never shows two "Other" bars. Only for additive measures (counts, sums).
export function topNWithOther(
  items: LabelValue[],
  n: number,
  otherLabel: string = "Other",
): LabelValue[] {
  const sorted = [...items].sort(byValueDesc);
  const limit = clampCount(n);
  if (sorted.length <= limit) return sorted;
  const keptAt = new Set<number>();
  for (let i = 0; i < sorted.length && keptAt.size < limit - 1; i++) {
    if (sorted[i].label !== otherLabel) keptAt.add(i);
  }
  const kept = sorted.filter((_, i) => keptAt.has(i));
  const rest = sorted.reduce(
    (sum, item, i) => (keptAt.has(i) ? sum : sum + item.value),
    0,
  );
  return [...kept, { label: otherLabel, value: rest }];
}

// The largest `n` items, without an "Other" fold: for non-additive measures
// (rates, percents, averages, percentiles, durations), where summing the
// remainder is meaningless.
export function topNOnly(items: LabelValue[], n: number): LabelValue[] {
  return [...items].sort(byValueDesc).slice(0, clampCount(n));
}

const GUID_RX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Every GUID in `text` shortened to "5947…a1c2", so identifiers stay distinguishable
// without being shown whole.
export function shortId(text: string): string {
  return text.replace(GUID_RX, (g) => `${g.slice(0, 4)}…${g.slice(-4)}`);
}

// Separator: @, a full-width ＠ or a URL-encoded %40. Domain labels: letters
// and digits in any script, _ and -, split by a dot (also ．, 。, ｡ or %2E).
// Local part: letters and digits in any script plus every RFC 5322 atext
// character and ’ (o'brien@…, first&last@…).
const EMAIL_SEPARATOR_RX = /@|＠|%40/g;
const EMAIL_DOMAIN_RX =
  /[\p{L}\p{M}\p{N}_-]+(?:(?:\.|．|。|｡|%2[Ee])[\p{L}\p{M}\p{N}_-]+)+/uy;
const EMAIL_LOCAL_CHAR_RX = /^[\p{L}\p{M}\p{N}!#$%&'’*+/=?^_`{|}~.-]$/u;

// Start of the run of local-part characters that ends at `end`, never before
// `floor`. A run already measured for a separator that had no domain
// ([knownFrom, knownTo)) is skipped in one step, so every character is read
// at most once per call: the scan stays linear on a long separator-free blob.
function localPartStart(
  s: string,
  end: number,
  floor: number,
  knownFrom: number,
  knownTo: number,
): number {
  let i = end;
  while (i > floor) {
    if (i === knownTo && knownFrom < knownTo) {
      i = Math.max(knownFrom, floor);
      continue;
    }
    const low = s.charCodeAt(i - 1);
    const pair =
      i - 2 >= floor &&
      low >= 0xdc00 &&
      low <= 0xdfff &&
      s.charCodeAt(i - 2) >= 0xd800 &&
      s.charCodeAt(i - 2) <= 0xdbff;
    const width = pair ? 2 : 1;
    if (!EMAIL_LOCAL_CHAR_RX.test(s.slice(i - width, i))) break;
    i -= width;
  }
  return i;
}

// Free text from a data source (incident titles, comments) can carry email
// addresses; a dashboard renders "[email]" in their place. Adjacent addresses
// ("alice@x.com/bob@y.com") are each masked; characters joining them that are
// also local-part characters ("/", or "&b=" in "a=alice@x.com&b=bob@y.com")
// are masked with the second address.
export function maskEmails(text: string | null | undefined): string {
  const s = String(text ?? "");
  let out = "";
  let floor = 0;
  let knownFrom = 0;
  let knownTo = 0;
  for (const sep of s.matchAll(EMAIL_SEPARATOR_RX)) {
    const at = sep.index ?? 0;
    if (at < floor) continue;
    const start = localPartStart(s, at, floor, knownFrom, knownTo);
    EMAIL_DOMAIN_RX.lastIndex = at + sep[0].length;
    const domain = start < at ? EMAIL_DOMAIN_RX.exec(s) : null;
    if (!domain) {
      knownFrom = start;
      knownTo = at;
      continue;
    }
    out += s.slice(floor, start) + "[email]";
    floor = EMAIL_DOMAIN_RX.lastIndex;
  }
  return floor === 0 ? s : out + s.slice(floor);
}

// `value` with every string inside it, at any depth (nested arrays and plain or
// null-prototype objects), passed through `maskEmails`. Any other object (a
// Date, Map, class instance) comes back unchanged. A shared or cyclic
// reference maps to one shared copy, and every key (an own "__proto__"
// included) stays an own data field of the copy.
export function maskEmailsDeep<T>(value: T): T {
  return maskDeep(value, new WeakMap()) as T;
}

// A table row with its emails masked: its own fields, and any plain objects
// and arrays nested in them. A class-instance row comes back as a plain object
// of its own enumerable fields (prototype getters are not copied).
export function maskEmailsRow<T>(row: T): T {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return maskEmailsDeep(row);
  }
  if (row instanceof Date) return row;
  const seen = new WeakMap<object, unknown>();
  const out: Record<string, unknown> = {};
  seen.set(row as object, out);
  for (const [key, value] of Object.entries(row)) {
    Object.defineProperty(out, key, {
      value: maskDeep(value, seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out as T;
}

function maskDeep(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (typeof value === "string") return maskEmails(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const out: unknown[] = new Array(value.length);
    seen.set(value, out);
    value.forEach((inner, i) => {
      out[i] = maskDeep(inner, seen);
    });
    return out;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const [key, inner] of Object.entries(value)) {
    Object.defineProperty(out, key, {
      value: maskDeep(inner, seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

// "mcp__sharepoint_onedrive__GetDriveItem" -> "Sharepoint onedrive · GetDriveItem".
// Splits on the double underscore (server names carry single ones), shortens any
// GUID, and returns other names unchanged apart from the GUID shortening.
export function toolLabel(raw: string | null | undefined): string {
  const name = shortId(String(raw ?? "").trim());
  if (!name) return "Unknown";
  const [prefix, server, ...rest] = name.split("__");
  if (prefix !== "mcp" || !server || rest.length === 0) return name;
  const readable = server.replace(/[-_]+/g, " ");
  return `${readable.charAt(0).toUpperCase()}${readable.slice(1)} · ${rest.join("__")}`;
}

function severityNumber(severity: number | string | null | undefined): number {
  if (severity == null) return NaN;
  if (typeof severity === "string" && severity.trim() === "") return NaN;
  return Number(severity);
}

// IcM severity 25 is "Sev 2.5"; every other value reads "Sev N".
export function icmSeverityLabel(severity: number | string | null | undefined): string {
  const n = severityNumber(severity);
  if (!Number.isFinite(n)) return "Sev ?";
  return n === 25 ? "Sev 2.5" : `Sev ${n}`;
}

// Sort key that orders IcM severities 1, 2, 2.5, 3, 4.
export function icmSeverityRank(severity: number | string | null | undefined): number {
  const n = severityNumber(severity);
  if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY;
  return n === 25 ? 2.5 : n;
}

// "COPILOTCOWORK\Copilot Cowork (Triage\RFC)" -> "Copilot Cowork (Triage\RFC)".
// Drops only the tenant before the FIRST backslash; the team part may contain more.
export function icmTeamLabel(name: string | null | undefined): string {
  const text = String(name ?? "").trim();
  if (!text) return "Unknown";
  const cut = text.indexOf("\\");
  return cut >= 0 && cut < text.length - 1 ? text.slice(cut + 1) : text;
}

const KUSTO_CACHE_SET = /^\s*set\s+query_results_cache_max_age\b/im;

// Prefixes a KQL query with a results-cache request property, so a retry after a
// gateway timeout and every other viewer within `maxAgeMinutes` read the cluster's
// cached result instead of running the query again. A query that already sets it
// on any line (after a comment or another `set`, say) is returned unchanged.
export function kustoCached(csl: string, maxAgeMinutes = 5): string {
  if (KUSTO_CACHE_SET.test(csl)) return csl;
  const minutes = Number.isFinite(maxAgeMinutes)
    ? Math.max(1, Math.floor(maxAgeMinutes))
    : 5;
  return `set query_results_cache_max_age = time(${minutes}m);\n${csl}`;
}

// Connector ids as `ms.config.json` records them; any other id renders with a
// generic icon and the id itself, so every connection has a source to show.
export type TileConnector =
  | "shared_kusto"
  | "shared_sql"
  | "shared_commondataserviceforapps"
  | "shared_sharepointonline"
  | "shared_excelonlinebusiness"
  | (string & {});

export type TileParamValue = string | number | boolean | string[];

// The request a tile sent. Query sources carry their text (Kusto without the
// cache line `runKql` adds); a read without a query carries the generated-client
// operation it called and the parameters that shaped the result.
export type TileRequest =
  | { kind: "kql"; cluster: string; database: string; text: string }
  | { kind: "sql"; server: string; database: string; text: string }
  | { kind: "fetchxml"; entity: string; text: string }
  | {
      kind: "operation";
      operation: string;
      params: Record<string, TileParamValue>;
      // "source" when the operation returns figures the source already totalled
      // (a DAX query on a Power BI semantic model, a summary table, a SQL view):
      // the page then shows no browser-totals note. "none" when no tile totals
      // the rows (a detail table that only lists them): no note either. Left
      // out, the operation is read as raw rows the browser totals.
      totals?: "source" | "none";
    }
  // Rows bundled into the app (an uploaded file, sample data): nothing is
  // fetched, so every row is present and the page shows no browser-totals note.
  | { kind: "embedded"; file: string; rows?: number };

// One per query, built from the current filters and passed to both the fetch
// and every card that shows the query's result.
export interface TileSource {
  connector: TileConnector;
  // A system label the author knows ("IcM"); never inferred from a URL.
  system?: string;
  request: TileRequest;
  // One sentence for work done in the browser after the rows arrived.
  computed?: string;
}

// A tile fed by one read, or by several joined in the browser (orders against
// targets, say): one entry per read, each shown in the tile's popover.
export type TileSources = TileSource | readonly TileSource[];

export function tileSourceList(sources: TileSources): readonly TileSource[] {
  return "connector" in sources ? [sources] : sources;
}

// An empty list is no source: the card then offers no "View Query" item.
export function tileSourcesOrNone(sources: TileSources | undefined): TileSources | undefined {
  return sources && tileSourceList(sources).length > 0 ? sources : undefined;
}

// Facts known only after the fetch, passed to a card beside its `source`.
export interface TileSourceStats {
  loadedRows?: number;
  // The read stopped at its row cap.
  capped?: boolean;
  // Paged reads: how many requests were sent.
  pages?: number;
}

export type KqlTarget = { cluster: string; database: string; csl: string };

// Sends a Kusto descriptor through the caller's generated-client adapter with the
// results cache added, so the query a tile shows is the query it sent.
export function runKql<R>(
  request: Extract<TileRequest, { kind: "kql" }>,
  send: (target: KqlTarget) => Promise<R>,
  maxAgeMinutes?: number,
): Promise<R> {
  return send({
    cluster: request.cluster,
    database: request.database,
    csl: kustoCached(request.text, maxAgeMinutes),
  });
}

function paramText(value: TileParamValue): string {
  // JSON for a list, so ["a, b"] and ["a", "b"] read differently.
  return Array.isArray(value) ? JSON.stringify(value) : String(value);
}

// Where the request went: "cluster / database", "server / database", the entity
// or the operation.
export function tileRequestTarget(request: TileRequest): string {
  switch (request.kind) {
    case "kql":
      return `${request.cluster} / ${request.database}`;
    case "sql":
      return `${request.server} / ${request.database}`;
    case "fetchxml":
      return request.entity;
    case "operation":
      return request.operation;
    case "embedded":
      return request.file;
  }
}

// The request as copyable text: the query itself, or the operation followed by
// one `name: value` line per parameter.
export function tileRequestText(request: TileRequest): string {
  if (request.kind === "embedded") {
    return request.rows === undefined
      ? request.file
      : `${request.file}\nrows: ${request.rows}`;
  }
  if (request.kind !== "operation") return request.text;
  const lines = Object.entries(request.params).map(
    ([name, value]) => `${name}: ${paramText(value)}`,
  );
  return [request.operation, ...lines].join("\n");
}

// "3,812 rows loaded · paged, 3 pages · stopped at the row cap", or null.
export function tileStatsLine(stats: TileSourceStats | undefined): string | null {
  if (!stats) return null;
  const parts: string[] = [];
  if (isFiniteNumber(stats.loadedRows)) {
    const rows = Math.max(0, Math.floor(stats.loadedRows));
    parts.push(`${numberFormat({}).format(rows)} ${rows === 1 ? "row" : "rows"} loaded`);
  }
  const pages = isFiniteNumber(stats.pages) ? Math.floor(stats.pages) : 0;
  if (pages > 1) parts.push(`paged, ${pages} pages`);
  if (stats.capped) parts.push("stopped at the row cap");
  return parts.length ? parts.join(" · ") : null;
}

function rangeEndingToday(from: (today: Date) => Date): DateRange {
  const today = new Date();
  return { from: startOfDay(from(today)), to: endOfDay(today) };
}

export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  { label: "Last 7 days", range: () => rangeEndingToday((t) => subDays(t, 6)) },
  {
    label: "Last 30 days",
    range: () => rangeEndingToday((t) => subDays(t, 29)),
  },
  {
    label: "Last 90 days",
    range: () => rangeEndingToday((t) => subDays(t, 89)),
  },
  { label: "This quarter", range: () => rangeEndingToday(startOfQuarter) },
  { label: "Year to date", range: () => rangeEndingToday(startOfYear) },
  {
    label: "Last 12 months",
    range: () => rangeEndingToday((t) => startOfMonth(subMonths(t, 11))),
  },
];

// A two-click calendar pick as a whole-day range: the earlier day starts it at
// midnight and the later one ends it at 23:59:59.999, in either click order.
export function wholeDayRange(first: Date, second: Date): DateRange {
  const [from, to] = second < first ? [second, first] : [first, second];
  return { from: startOfDay(from), to: endOfDay(to) };
}

// "Mar 1 – Mar 31, 2026" (year shown once when both ends share it); an em dash
// when either end is not a valid date.
export function formatDateRange(range: DateRange): string {
  if (!isValid(range.from) || !isValid(range.to)) return EMPTY_METRIC;
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const from = formatDate(range.from, sameYear ? "MMM d" : "MMM d, yyyy");
  return `${from} – ${formatDate(range.to, "MMM d, yyyy")}`;
}
