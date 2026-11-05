import { Cell, Pie, PieChart } from "recharts";

import {
  categorySelectHandler,
  OTHER_COLOR,
  seriesColor,
} from "@/components/dashboard/chart-utils";
import {
  ChartDataTable,
  ChartProblem,
} from "@/components/dashboard/chart-extras";
import {
  useChartTable,
  useReportChartIssues,
} from "@/components/dashboard/chart-hooks";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  categoryTable,
  checkCategoryData,
  MAX_DONUT_SLICES,
  toChartNumber,
} from "@/lib/dashboard-charts";
import {
  formatMetric,
  topNWithOther,
  type LabelValue,
  type MetricFormat,
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const OTHER_LABEL = "Other";

// Donut for part-to-whole shares. At most six slices; the rest fold into
// "Other". Non-positive values are dropped. Use BarBreakdown for rankings.
// `variant="pie"` draws a full pie: use it when the request says "pie"; a
// request for a bar chart is a BarBreakdown, never this chart.
// Under the donut: every category as a table (`dataTable`).
export function ShareChart({
  data,
  variant = "donut",
  format = "number",
  currency,
  height = 240,
  onSelect,
  ariaLabel,
  dataTable = true,
}: {
  data: LabelValue[];
  variant?: "donut" | "pie";
  format?: MetricFormat;
  currency?: string;
  height?: number;
  onSelect?: (label: string) => void;
  ariaLabel?: string;
  dataTable?: boolean;
}) {
  const issues = checkCategoryData(data, "share", format);
  const ok = issues.errors.length === 0;
  // A donut is a part-to-whole chart, so the table states shares unless the
  // values are percents; it drops them when a value is negative.
  const additive = format !== "percent";
  const table = ok
    ? categoryTable(data, format, currency, { withShare: additive })
    : null;
  useReportChartIssues("ShareChart", issues);
  useChartTable(table);
  if (!ok) return <ChartProblem issues={issues} />;

  const positive = data
    .map((d) => ({ ...d, value: toChartNumber(d.value) ?? 0 }))
    .filter((d) => d.value > 0);
  const items = topNWithOther(positive, MAX_DONUT_SLICES, OTHER_LABEL);
  const folded = positive.length > items.length;
  const isOther = (index: number) => folded && index === items.length - 1;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const share = (value: number) => (total > 0 ? value / total : 0);
  const colorAt = (index: number) =>
    isOther(index) || index >= 5 ? OTHER_COLOR : seriesColor(index);
  const summary =
    ariaLabel ??
    `${variant === "pie" ? "Pie" : "Donut"} chart of ${items.length} shares: ` +
      items
        .map(
          (item) =>
            `${item.label} ${formatMetric(share(item.value), "percent")}`,
        )
        .join(", ");

  return (
    // The row layout keys on the card's width, not the viewport's: a donut in a narrow
    // grid column stacks its legend underneath instead of squeezing it off the card.
    <div className="@container">
      {items.length === 0 ? (
        // Nothing positive to divide: say so rather than draw an empty ring.
        <p className="py-8 text-center text-sm text-muted-foreground">
          No positive values to show as shares.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4 @md:flex-row">
          <ChartContainer
            config={{ value: { label: "Value" } }}
            className="aspect-square w-full max-w-60 shrink-0"
            style={{ height }}
            role="img"
            aria-label={summary}
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {String(name)}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatMetric(Number(value), format, currency)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={items}
                dataKey="value"
                nameKey="label"
                innerRadius={variant === "pie" ? 0 : "60%"}
                outerRadius="90%"
                strokeWidth={2}
                isAnimationActive={false}
                onClick={categorySelectHandler(items, folded, onSelect)}
                className={cn(onSelect && "cursor-pointer")}
              >
                {items.map((item, index) => (
                  <Cell key={`${item.label}-${index}`} fill={colorAt(index)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="grid w-full min-w-0 gap-1.5 text-sm @md:w-auto @md:flex-1">
            {items.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: colorAt(index) }}
                />
                <span className="min-w-0 flex-1 truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="font-medium tabular-nums">
                  {formatMetric(item.value, format, currency)}
                </span>
                <span className="w-12 text-right text-muted-foreground tabular-nums">
                  {formatMetric(share(item.value), "percent")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {dataTable && table && <ChartDataTable table={table} />}
    </div>
  );
}
