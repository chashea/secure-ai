import { useContext, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";

import {
  BrowserTotalsCountContext,
  BrowserTotalsRegistryContext,
  type BrowserTotalsRegistry,
} from "@/components/dashboard/browser-totals";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Shown once per page when any tile totals raw rows in the browser
// (browser-totals.ts): such a source may hold more rows than the page loads.
// Fixed words, naming no connector.
export const BROWSER_TOTALS_TITLE = "Totals are calculated in your browser";
export const BROWSER_TOTALS_TEXT =
  "They come from the rows this dashboard loads, so a large source may not be " +
  "fully counted. For exact totals, point the dashboard at a source that totals " +
  "the data itself, such as a SQL view, a Kusto query or a Power BI semantic model.";

// Held by DashboardPage: counts the mounted tiles that total in the browser.
export function BrowserTotalsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const registry = useMemo<BrowserTotalsRegistry>(
    () => ({
      add(id) {
        setIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
        return () =>
          setIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
      },
    }),
    [],
  );
  return (
    <BrowserTotalsRegistryContext.Provider value={registry}>
      <BrowserTotalsCountContext.Provider value={ids.size}>
        {children}
      </BrowserTotalsCountContext.Provider>
    </BrowserTotalsRegistryContext.Provider>
  );
}

// Rendered by DashboardHeader under the title row: a warning that shows only
// its title until the user expands it for the explanation.
export function BrowserTotalsNotice() {
  const [open, setOpen] = useState(false);
  if (useContext(BrowserTotalsCountContext) === 0) return null;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      role="note"
      data-browser-totals-notice=""
      className="rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1">{BROWSER_TOTALS_TITLE}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-3 pl-11 leading-relaxed">
        {BROWSER_TOTALS_TEXT}
      </CollapsibleContent>
    </Collapsible>
  );
}
