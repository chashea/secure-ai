import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  architectureCoverageFor, coverageSourcesFor, referenceTitle, type FlowArchitectureRow,
} from "@/lib/flow-architecture-coverage";
import type { AgentFlow } from "@/lib/agent-flow-content";

function RowEvidence({ row }: { row: FlowArchitectureRow }) {
  const sources = coverageSourcesFor(row);
  if (!row.integrations.length && !sources.length) return null;
  return <details className="mt-2">
    <summary className="cursor-pointer text-xs font-medium text-foreground">Integrations and references</summary>
    {!!row.integrations.length && <ul className="mt-2 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
      {row.integrations.map((link) => <li key={link.id}><span className="font-medium text-foreground">{referenceTitle(link.id)}</span> — {link.how}</li>)}
    </ul>}
    {!!sources.length && <ul aria-label={`${row.product.title} references`} className="mt-2 flex flex-col gap-1.5">
      {sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-xs text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{source.label}<ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" /></a></li>)}
    </ul>}
  </details>;
}

export function FlowArchitectureCoverage({ view }: { view: AgentFlow }) {
  const [showAll, setShowAll] = useState(false);
  const rows = architectureCoverageFor(view).filter((row) => showAll || row.representation !== "other");
  return <section aria-label="Reference architecture controls" className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-semibold">Reference architecture controls</h3>
      <div role="group" aria-label="Architecture control scope" className="inline-flex gap-1">
        <Button size="sm" variant={!showAll ? "secondary" : "ghost"} aria-pressed={!showAll} onClick={() => setShowAll(false)}>Relevant to this flow</Button>
        <Button size="sm" variant={showAll ? "secondary" : "ghost"} aria-pressed={showAll} onClick={() => setShowAll(true)}>All reference controls</Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Architecture mappings are not evidence that a customer has enabled the controls. Shared controls are not extra network hops.</p>
    <div className="rounded-xl border bg-card">
      <Table className="min-w-[850px] table-fixed">
        <TableHeader><TableRow>
          <TableHead className="w-[220px]">Control</TableHead>
          <TableHead className="w-[210px]">Representation</TableHead>
          <TableHead>Scope and limits</TableHead>
        </TableRow></TableHeader>
        <TableBody>{rows.map((row) => <TableRow key={row.product.id} data-reference-control={row.product.id} data-flow-representation={row.representation} className="hover:bg-transparent">
          <TableHead scope="row" className="h-auto whitespace-normal py-3 align-top font-medium text-foreground">
            {row.product.title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{row.product.pillar}</span>
          </TableHead>
          <TableCell className="whitespace-normal py-3 align-top text-sm">
            <span className="font-medium">{row.representation === "diagram" ? "In diagram" : row.representation === "shared" ? "Shared control" : "Different scope"}</span>
            {!!row.diagramNodes.length && <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">{row.diagramNodes.map((node) => <li key={node.id}>{node.title}</li>)}</ul>}
            {!!row.links.length && <p className="mt-1 text-xs text-muted-foreground">{[...new Set(row.links.map((link) => link.kind === "observe" ? "Discovery / monitoring" : "Policy / protection"))].join(" · ")}</p>}
          </TableCell>
          <TableCell className="whitespace-normal py-3 align-top text-sm leading-relaxed">
            {row.links.length ? <ul className="flex flex-col gap-2">{row.links.map((link) => <li key={link.id}><span className="font-medium">{referenceTitle(link.id)}</span> — {link.how}</li>)}</ul>
              : row.representation === "diagram" ? <p>{row.product.desc}</p>
              : <p className="text-muted-foreground">{row.scopeNote ?? "No direct relationship to the selected flow is defined in the reference architecture."}{!!row.product.protects.length && <> Reference targets: {[...new Set(row.product.protects.map((link) => referenceTitle(link.id)))].join("; ")}.</>}</p>}
            {row.representation !== "other" && <RowEvidence row={row} />}
          </TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
  </section>;
}
