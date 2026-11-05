import { format } from "date-fns";

// A dashboard time window as one string, so it lives in filter state and the
// query string unchanged: a preset key ("24h") that slides with the clock, or
// a fixed custom range of two UTC minutes ("2026-10-01T15:00Z..2026-10-02T00:30Z"),
// so a shared link names the same instants in every time zone. The picker and
// the label show those instants in the viewer's local time.
// No React here, so pages, hooks and tests can all share it.

export type TimeRangePreset = { value: string; label: string; durationMs: number };

// One holder for a page's window rules: pass the same object to
// `TimeRangeFilter`, `isTimeRangeValue`, `kqlTimeFilter` and `kqlTimeBin`, so
// a link can never carry a preset the dropdown does not offer or a custom range
// longer than the picker allows. `maxDays` defaults to 7.
export type TimeRangeOptions = {
  presets?: readonly TimeRangePreset[];
  maxDays?: number;
};

export type ResolvedTimeRange = {
  from: Date;
  to: Date;
  preset?: TimeRangePreset;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Relative windows ending now, as in Azure Data Explorer's time picker. Capped
// at 7 days so a default Kusto dashboard does not scan weeks of rows.
export const DEFAULT_TIME_RANGE_MAX_DAYS = 7;
export const DEFAULT_TIME_RANGE_PRESETS: TimeRangePreset[] = [
  { value: "30m", label: "Last 30 minutes", durationMs: 30 * MINUTE },
  { value: "1h", label: "Last hour", durationMs: HOUR },
  { value: "6h", label: "Last 6 hours", durationMs: 6 * HOUR },
  { value: "12h", label: "Last 12 hours", durationMs: 12 * HOUR },
  { value: "24h", label: "Last 24 hours", durationMs: DAY },
  { value: "3d", label: "Last 3 days", durationMs: 3 * DAY },
  { value: "7d", label: "Last 7 days", durationMs: 7 * DAY },
];

const UTC_MINUTE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/;
const RANGE_SEPARATOR = "..";
const EMPTY_LABEL = "—";
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// The local instant at `time` on `day`, or null when that wall-clock time does
// not exist there (a daylight-saving spring-forward gap), which `setHours`
// would otherwise silently move by the gap.
function atTime(day: Date, time: string): Date | null {
  const [hours, minutes] = time.split(":").map(Number);
  const at = new Date(day);
  at.setHours(hours, minutes, 0, 0);
  return at.getHours() === hours && at.getMinutes() === minutes ? at : null;
}

function utcMinute(date: Date): string {
  return `${date.toISOString().slice(0, 16)}Z`;
}

function parseUtcMinute(text: string): Date | null {
  const match = UTC_MINUTE_PATTERN.exec(text);
  if (!match) return null;
  const [year, month, day, hours, minutes] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  return utcMinute(date) === text ? date : null;
}

function presetsOf(options: TimeRangeOptions): readonly TimeRangePreset[] {
  return options.presets ?? DEFAULT_TIME_RANGE_PRESETS;
}

// One hour of slack so `maxDays` local calendar days that span a daylight-saving
// fall-back (an hour longer) still pass, in the picker and in a link.
function withinCap(range: { from: Date; to: Date }, maxDays = DEFAULT_TIME_RANGE_MAX_DAYS): boolean {
  return range.to.getTime() - range.from.getTime() <= maxDays * DAY + HOUR;
}

// The value for a fixed range, to the minute in UTC, earlier end first.
export function customTimeRange(first: Date, second: Date): string {
  const [from, to] = second < first ? [second, first] : [first, second];
  return `${utcMinute(floorMinute(from))}${RANGE_SEPARATOR}${utcMinute(floorMinute(to))}`;
}

function floorMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / MINUTE) * MINUTE);
}

// `kept`, to the minute, when the field still names it (same local day and minute), else the
// local instant the field names: a time in a repeated (fall-back) hour cannot
// say which of its two instants it was, so an end the user did not change keeps its own.
// The minute floor keeps the order and cap checks on the instants the value will store.
function endAt(day: Date, time: string, kept: Date | undefined): Date | null {
  const unchanged =
    kept &&
    kept.getFullYear() === day.getFullYear() &&
    kept.getMonth() === day.getMonth() &&
    kept.getDate() === day.getDate() &&
    format(kept, "HH:mm") === time;
  return unchanged ? floorMinute(kept) : atTime(day, time);
}

// The custom picker's day and time fields as a value, or the reason they
// cannot be applied yet. A missing end day is the start day. `kept` holds the
// instants the fields were filled from, so each end the user leaves as is keeps its instant.
export function timeRangeFromParts(
  parts: {
    fromDay?: Date;
    toDay?: Date;
    fromTime: string;
    toTime: string;
    kept?: { from?: Date; to?: Date };
  },
  maxDays = DEFAULT_TIME_RANGE_MAX_DAYS,
): { value: string } | { error: string } {
  if (!parts.fromDay) return { error: "Pick a start day." };
  if (!TIME_PATTERN.test(parts.fromTime) || !TIME_PATTERN.test(parts.toTime)) {
    return { error: "Enter a start and an end time." };
  }
  const from = endAt(parts.fromDay, parts.fromTime, parts.kept?.from);
  const to = endAt(parts.toDay ?? parts.fromDay, parts.toTime, parts.kept?.to);
  if (!from || !to) return { error: "That time does not exist on that day (daylight saving). Pick another time." };
  if (from >= to) return { error: "The end must be after the start." };
  if (!withinCap({ from, to }, maxDays)) {
    return { error: `Pick at most ${maxDays} ${maxDays === 1 ? "day" : "days"}.` };
  }
  return { value: customTimeRange(from, to) };
}

// A custom value's two ends, or null when it is not two valid UTC minutes with
// the start strictly before the end.
export function parseCustomTimeRange(value: string): { from: Date; to: Date } | null {
  const parts = value.split(RANGE_SEPARATOR);
  if (parts.length !== 2) return null;
  const from = parseUtcMinute(parts[0]);
  const to = parseUtcMinute(parts[1]);
  return from && to && from < to ? { from, to } : null;
}

function findPreset(value: string, presets: readonly TimeRangePreset[]): TimeRangePreset | undefined {
  return presets.find((preset) => preset.value === value);
}

// The absolute window a value stands for at `now`, or null for a value that is
// neither one of the presets nor a valid custom range within the cap.
export function resolveTimeRange(
  value: string,
  options: TimeRangeOptions = {},
  now: Date = new Date(),
): ResolvedTimeRange | null {
  const preset = findPreset(value, presetsOf(options));
  if (preset) {
    return { from: new Date(now.getTime() - preset.durationMs), to: now, preset };
  }
  const range = parseCustomTimeRange(value);
  return range && withinCap(range, options.maxDays) ? range : null;
}

// True for one of the presets or a valid custom range within the cap. Pass it
// as the filter's `useUrlFilters` option with the page's options, so a
// hand-edited link reads as the default: `{ window: (v) => isTimeRangeValue(v, windowOptions) }`.
export function isTimeRangeValue(value: string, options: TimeRangeOptions = {}): boolean {
  return resolveTimeRange(value, options) !== null;
}

// "Last 24 hours", or "Oct 1, 08:00 – Oct 2, 2026, 17:30" for a custom range
// (the year shown once when both ends share it).
export function formatTimeRange(
  value: string,
  presets: readonly TimeRangePreset[] = DEFAULT_TIME_RANGE_PRESETS,
): string {
  const preset = findPreset(value, presets);
  if (preset) return preset.label;
  const range = parseCustomTimeRange(value);
  if (!range) return EMPTY_LABEL;
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const from = format(range.from, sameYear ? "MMM d, HH:mm" : "MMM d, yyyy, HH:mm");
  return `${from} – ${format(range.to, "MMM d, yyyy, HH:mm")}`;
}

// A KQL timespan literal: whole days, hours or minutes when exact, else ms.
export function kqlTimespan(durationMs: number): string {
  const ms = Math.max(0, Math.round(durationMs));
  if (ms > 0 && ms % DAY === 0) return `${ms / DAY}d`;
  if (ms > 0 && ms % HOUR === 0) return `${ms / HOUR}h`;
  if (ms > 0 && ms % MINUTE === 0) return `${ms / MINUTE}m`;
  return `${ms}ms`;
}

function requireRange(value: string, options: TimeRangeOptions): ResolvedTimeRange {
  const range = resolveTimeRange(value, options);
  if (!range) throw new Error("The window is not a time range this dashboard offers.");
  return range;
}

// The KQL predicate for a window, built only from a preset's duration or a
// parsed custom range, never from the raw value: `| where ${kqlTimeFilter(w)}`.
// A preset slides with the cluster's clock (`ago`); a custom range is sent in
// UTC. Throws for a value the page's options do not admit.
export function kqlTimeFilter(
  value: string,
  column = "TIMESTAMP",
  options: TimeRangeOptions = {},
): string {
  const range = requireRange(value, options);
  if (range.preset) return `${column} > ago(${kqlTimespan(range.preset.durationMs)})`;
  return `${column} between (datetime(${range.from.toISOString()}) .. datetime(${range.to.toISOString()}))`;
}

// A trend bin by window length: 1m up to an hour, 10m up to 6 hours, 1h up
// to 2 days, 6h up to 7 days, then 1d (12 to 60 points for the default presets).
// The day thresholds allow the same fall-back hour as the cap.
export function kqlTimeBin(value: string, options: TimeRangeOptions = {}): string {
  const range = requireRange(value, options);
  const span = range.to.getTime() - range.from.getTime();
  if (span <= HOUR) return "1m";
  if (span <= 6 * HOUR) return "10m";
  if (span <= 2 * DAY + HOUR) return "1h";
  if (span <= 7 * DAY + HOUR) return "6h";
  return "1d";
}
