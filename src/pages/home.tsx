import { Fragment, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DefenseView } from "@/components/defense-view";
import { AgentFlows } from "@/components/agent-flows";
import { ReferenceArchitecture } from "@/components/reference-architecture";
import { ContentReview } from "@/components/content-review";
import { GATEWAY_ROUTES } from "@/lib/content-review";
import {
  GATEWAYS, ROLLOUT, SHADOW,
  type Flow, type Head, type GridRow,
} from "@/lib/content";

function FlowStrip({ flow }: { flow: Flow[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2">
      {flow.map((f, i) => (
        <Fragment key={i}>
          <li className={cn("min-w-[150px] flex-1 rounded-lg border px-3 py-2", f.gw ? "border-primary bg-primary/10" : "bg-card")}>
            <p className={cn("text-sm font-semibold", f.gw && "text-primary")}>{f.title}</p>
            <p className="text-xs text-muted-foreground">{f.sub}</p>
          </li>
          {i < flow.length - 1 && (
            <li aria-hidden="true" className="flex items-center text-muted-foreground"><ArrowRight className="size-4" /></li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}

function Takeaway({ text }: { text: string }) {
  return (
    <p className="rounded-lg border-l-4 border-primary bg-primary/10 px-4 py-3 text-sm font-medium">{text}</p>
  );
}

function Grid({ heads, rows, corner }: { heads: Head[]; rows: GridRow[]; corner?: string }) {
  return (
    <div className="rounded-xl border bg-card">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-40 align-bottom">{corner ?? ""}</TableHead>
            {heads.map((h) => (
              <TableHead key={h.title} className="h-auto whitespace-normal py-3 align-top">
                <span className="block text-sm font-semibold text-foreground">{h.title}</span>
                {h.sub && <span className="block text-xs font-normal text-muted-foreground">{h.sub}</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label} className="hover:bg-transparent">
              <TableHead scope="row" className="h-auto whitespace-normal py-3 align-top font-semibold text-foreground">
                {r.label}
                {r.owner && <span className="block text-xs font-normal text-muted-foreground">{r.owner}</span>}
              </TableHead>
              {r.cells.map((c, i) => (
                <TableCell key={i} className="whitespace-normal py-3 align-top">
                  {c.length === 1 ? (
                    <span className="text-sm leading-relaxed">{c[0]}</span>
                  ) : (
                    <ul className="flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed">
                      {c.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return <h2 className="text-xl font-semibold tracking-tight">{title}</h2>;
}

function GatewaysView() {
  const [lead, ...rest] = GATEWAYS.note.split(":");
  const hasLead = rest.length > 0 && lead.length < 30;
  return (
    <div className="flex flex-col gap-4">
      <SectionHead title={GATEWAYS.h2} />
      <div className="grid gap-3 lg:grid-cols-3" aria-label="Separate configured gateway paths">
        {GATEWAY_ROUTES.map((route) => <section key={route.title} className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">{route.title}</h3>
          <ol className="mt-3 flex flex-col gap-2 border-l-2 border-primary pl-3">
            {route.path.map((step) => <li key={step} className="text-sm">{step}</li>)}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{route.scope}</p>
        </section>)}
      </div>
      <Grid heads={GATEWAYS.heads} rows={GATEWAYS.rows} />
      <p className="rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed">
        {hasLead ? <><span className="font-semibold">{lead}:</span>{rest.join(":")}</> : GATEWAYS.note}
      </p>
      <Takeaway text={GATEWAYS.take} />
      <ContentReview tab="gateways" />
    </div>
  );
}

function ShadowView() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHead title={SHADOW.h2} />
      <FlowStrip flow={SHADOW.flow} />
      <Grid heads={SHADOW.heads} rows={SHADOW.rows} />
      <p className="rounded-lg border bg-card px-4 py-3 text-sm italic leading-relaxed">“{SHADOW.talk}”</p>
      <Takeaway text={SHADOW.take} />
      <ContentReview tab="shadow" />
    </div>
  );
}

function RolloutView() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHead title={ROLLOUT.h2} />
      <Grid heads={ROLLOUT.heads.map((t) => ({ title: t, sub: "" }))} rows={ROLLOUT.rows} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLLOUT.next.map((n) => (
          <div key={n.title} className="rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold">{n.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{n.text}</p>
          </div>
        ))}
      </div>
      <Takeaway text={ROLLOUT.take} />
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLLOUT.sources.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
                {s.label}<ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{ROLLOUT.preview}</p>
      </div>
      <ContentReview tab="rollout" />
    </div>
  );
}

export function HomePage() {
  const [tab, setTab] = useState("ref");
  const [flowView, setFlowView] = useState("studio");
  const open = (t: string, view: string) => {
    if (view) setFlowView(view);
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  const TABS = [
    { id: "ref", label: "Reference architecture", el: <ReferenceArchitecture /> },
    { id: "defense", label: "Defense in depth", el: <DefenseView onOpen={open} /> },
    { id: "arch", label: "Agent flows", el: <AgentFlows viewId={flowView} onViewChange={setFlowView} /> },
    { id: "gateways", label: "Gateways", el: <GatewaysView /> },
    { id: "shadow", label: "Shadow AI", el: <ShadowView /> },
    { id: "rollout", label: "Rollout", el: <RolloutView /> },
  ];

  return (
    <div className="mx-auto h-full w-full max-w-[1600px] px-4 py-4 sm:px-6">
      <h1 className="sr-only">Securing AI Agents</h1>
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="h-10">
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id} className="px-3">{t.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {TABS.map((t) => <TabsContent key={t.id} value={t.id}>{t.el}</TabsContent>)}
      </Tabs>
    </div>
  );
}
