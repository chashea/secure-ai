import { toChartNumber } from "@/lib/dashboard-charts";

// The x-value formatter lives with the chart helpers it serves; it is
// re-exported here for the components and callers that import it from this module.
export { formatXValue } from "@/lib/dashboard-charts";

// Shared helpers for the dashboard chart components.

export const OTHER_COLOR = "var(--muted-foreground)";

export function seriesColor(index: number): string {
  return `var(--chart-${(index % 5) + 1})`;
}

// The click handler a bar or slice gets from `onSelect`: it passes the clicked
// category's label, and a click on the folded "Other" bar (the last item when
// `folded`) selects nothing.
export function categorySelectHandler(
  items: { label: string }[],
  folded: boolean,
  onSelect: ((label: string) => void) | undefined,
): ((_: unknown, index: number) => void) | undefined {
  if (!onSelect) return undefined;
  return (_, index) => {
    if (folded && index === items.length - 1) return;
    const item = items[index];
    if (item) onSelect(item.label);
  };
}

// Counts must not get 0.75-style axis ticks; fractional data keeps them.
// A numeric string ("0.25") counts as the number the data check accepted.
export function allWholeNumbers(values: unknown[]): boolean {
  return values.every((v) => {
    const n = toChartNumber(v);
    return n === null || Number.isInteger(n);
  });
}

// Category labels on a horizontal bar chart are cut to this many characters,
// and the axis is sized to the longest label so none is clipped at the left
// edge. 8px per character covers 12px uppercase text.
export const CATEGORY_LABEL_CHARS = 22;

export function categoryAxisWidth(labels: string[]): number {
  const longest = Math.min(
    CATEGORY_LABEL_CHARS,
    labels.reduce((max, label) => Math.max(max, String(label).length), 0),
  );
  return Math.max(48, longest * 8 + 12);
}

// Room for the value labels beside horizontal bars, in px (7px per character of
// 12px digits, plus the label's offset). A positive bar's label sits past its
// right end; a negative bar's past its left end, which is the plot's left edge
// at the most negative value, so without room there it runs into the category
// labels. The right side keeps at least the 56px it always had.
export function valueLabelRoom(
  values: number[],
  text: (value: number) => string,
): { left: number; right: number } {
  const widest = (side: number[]) =>
    side.reduce((max, v) => Math.max(max, text(v).length * 7 + 10), 0);
  return {
    left: widest(values.filter((v) => v < 0)),
    right: Math.max(56, widest(values.filter((v) => v >= 0))),
  };
}
