import { createContext, useContext, useEffect, useId } from "react";

import { tileSourceList, type TileSources } from "@/lib/dashboard-data";

// A tile whose source is a connector operation (no query text) reads raw rows
// and totals them in the browser, whatever the connector, unless the read
// declares `totals: "source"` (the source returned figures it already totalled)
// or `totals: "none"` (no tile totals its rows, a list-only detail table).
export function totalsInBrowser(sources: TileSources | undefined): boolean {
  return (
    !!sources &&
    tileSourceList(sources).some(
      (s) => s.request.kind === "operation" && s.request.totals === undefined,
    )
  );
}

export type BrowserTotalsRegistry = { add: (id: string) => () => void };
export const BrowserTotalsRegistryContext = createContext<BrowserTotalsRegistry | null>(null);
export const BrowserTotalsCountContext = createContext(0);

// Called by every tile's menu with the tile's `source`.
export function useReportBrowserTotals(sources: TileSources | undefined) {
  const registry = useContext(BrowserTotalsRegistryContext);
  const id = useId();
  const inBrowser = totalsInBrowser(sources);
  useEffect(
    () => (registry && inBrowser ? registry.add(id) : undefined),
    [registry, inBrowser, id],
  );
}
