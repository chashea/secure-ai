import { useId, useRef, useState } from "react";
import { ExternalLink, Maximize2, PanelRightClose, PanelRightOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ContentReview } from "@/components/content-review";
import { FlowArchitectureCoverage } from "@/components/flow-architecture-coverage";
import { architectureCoverageFor, coverageSourcesFor, flowSourcesFor, referenceTitle } from "@/lib/flow-architecture-coverage";
import { useDiagramPalette } from "@/lib/diagram-palette";
import {
  AGENT_FLOWS, CONNECTION_STYLES, FLOW_VIEWBOX, REFERENCE_DETAILS, focusFlow,
  type AgentFlow, type FlowNode,
} from "@/lib/agent-flow-content";

const points = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");
const runtime = (kind: string) => kind === "traffic" || kind === "direct";

export function FlowDiagram({ view, selected, onSelect }: {
  view: AgentFlow; selected: string | null; onSelect: (id: string) => void;
}) {
  const uid = useId();
  const pal = useDiagramPalette();
  const f = pal.flow;
  const focus = focusFlow(view, selected);
  const active = selected !== null;
  const selectedControl = view.nodes.find((n) => n.id === selected)?.role === "control";
  const headings = view.headings ?? ["CALLER", "AI SERVICE / AGENT", view.id === "copilot" ? "EXTENSIBILITY" : view.id === "foundry" ? "CONFIGURED API ROUTING" : "SUPPORTED TOOL EGRESS", "DATA, MODELS & TOOLS"];
  return (
    <svg viewBox={FLOW_VIEWBOX} className="agent-flow-canvas block h-auto w-full min-w-[900px]" role="group" aria-labelledby={`${uid}-title ${uid}-desc`}>
      <title id={`${uid}-title`}>{`${view.title}: configured runtime and control relationships`}</title>
      <desc id={`${uid}-desc`}>{view.summary} Native buttons select components. Solid and dotted connections show distinct configured and direct paths; policy and coverage relationships are not network hops.</desc>
      <rect width={1200} height={690} fill={pal.canvas} />
      <rect x={12} y={18} width={1176} height={122} rx={14} fill={f.policyBand} stroke={f.policyStroke} />
      <text x={28} y={37} fill={f.policyLabel} fontSize={11} fontWeight={700} letterSpacing={1.4}>IDENTITY, CONFIGURATION & OVERSIGHT · NOT NETWORK HOPS</text>
      <rect x={12} y={158} width={1176} height={374} rx={14} fill={f.runtimeBand} stroke={f.runtimeStroke} />
      <g fill={f.columnLabel} fontSize={11} fontWeight={700} letterSpacing={1.4}>
        <text x={24} y={177}>{headings[0]}</text>
        <text x={306} y={177}>{headings[1]}</text>
        <text x={620} y={177}>{headings[2]}</text>
        <text x={930} y={177}>{headings[3]}</text>
      </g>
      <rect x={12} y={548} width={1176} height={130} rx={14} fill={f.controlBand} stroke={f.controlStroke} />
      <text x={28} y={570} fill={f.controlLabel} fontSize={11} fontWeight={700} letterSpacing={1.3}>SECURITY CONTROLS & VISIBILITY · WHERE CONFIGURED</text>
      {view.edges.filter((e) => runtime(e.kind) || (selectedControl && focus.edges.has(e.id))).map((e) => {
        const st = CONNECTION_STYLES[e.kind];
        const highlighted = active && focus.edges.has(e.id);
        return (
          <g key={e.id}>
            <polyline data-flow-edge={e.id} points={points(e.points)} fill="none" stroke={highlighted && runtime(e.kind) ? pal.selected : pal.line(st.color)}
              strokeOpacity={!active || highlighted ? 1 : 0.25} strokeWidth={highlighted ? 3 : 2} strokeDasharray={st.dash} strokeLinejoin="round" strokeLinecap="round" />
            {e.label && e.at && <text x={e.at[0]} y={e.at[1]} textAnchor="middle" fill={f.edgeLabel} fontSize={11}>{e.label}</text>}
          </g>
        );
      })}
      {view.nodes.map((n) => {
        const isSelected = selected === n.id;
        const onPath = focus.nodes.has(n.id);
        const style = f.nodes[n.role];
        return (
          <foreignObject key={n.id} x={n.x} y={n.y} width={n.w} height={n.h}>
            <button
              type="button" data-flow-node={n.id} aria-pressed={isSelected} onClick={() => onSelect(n.id)}
              className={`flow-node flex h-full w-full flex-col items-start justify-center gap-1 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${pal.focusRing}`}
              style={{ ...style, color: pal.nodeTitle, borderColor: isSelected ? pal.selected : onPath ? pal.flowOnPath : style.borderColor, borderWidth: isSelected ? 3 : onPath ? 2 : 1 }}
            >
              <span className="block text-[15px] font-semibold leading-[18px]">{n.title}</span>
              <span className="block text-[12px] leading-[15px]" style={{ color: pal.nodeSub }}>{n.sub}</span>
            </button>
          </foreignObject>
        );
      })}
    </svg>
  );
}

function FlowDetails({ item, view }: { item: FlowNode; view: AgentFlow }) {
  const coverage = architectureCoverageFor(view);
  return (
    <aside aria-label="Selected component details" className="self-start rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.role === "control" ? "Control scope" : "Selected component"}</p>
      <h3 className="mt-1 font-semibold">{item.title}</h3>
      {item.note && <p className="mt-2 text-sm leading-relaxed">{item.note}</p>}
      <div className="mt-3 flex flex-col gap-3">
        {item.refs.map((id) => {
          const detail = REFERENCE_DETAILS[id];
          if (!detail) return null;
          const row = coverage.find((r) => r.product.id === id);
          const sources = row ? coverageSourcesFor(row) : [];
          return <section key={id} className="border-t pt-3">
            <h4 className="text-sm font-semibold">{detail.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail.desc}</p>
            {!!row?.links.length && <ul className="mt-2 flex flex-col gap-2 text-xs leading-relaxed">{row.links.map((link) => <li key={link.id}><span className="font-medium">{referenceTitle(link.id)}</span> — {link.how}</li>)}</ul>}
            {!!sources.length && <ul className="mt-2 flex flex-col gap-1.5">{sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-xs text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{source.label}<ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" /></a></li>)}</ul>}
          </section>;
        })}
      </div>
    </aside>
  );
}

function Legend() {
  const pal = useDiagramPalette();
  return (
    <ul aria-label="Connection types" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {Object.entries(CONNECTION_STYLES).map(([key, st]) => (
        <li key={key} className="flex items-center gap-1.5">
          <svg width={28} height={12} aria-hidden="true"><line x1={0} y1={6} x2={28} y2={6} stroke={pal.line(st.color)} strokeWidth={2} strokeDasharray={st.dash} /></svg>{st.label}
        </li>
      ))}
      <li>Selected traffic is {pal.selectedName.toLowerCase()}; control lines retain their own meaning.</li>
    </ul>
  );
}

export function AgentFlows({ viewId, onViewChange }: { viewId: string; onViewChange: (id: string) => void }) {
  const view = AGENT_FLOWS.find((v) => v.id === viewId) ?? AGENT_FLOWS[0];
  const pal = useDiagramPalette();
  const [selected, setSelected] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const item = view.nodes.find((n) => n.id === selected) ?? view.nodes.find((n) => n.id === view.defaultNode)!;
  const sources = flowSourcesFor(view);
  const chooseView = (id: string) => { setSelected(null); onViewChange(id); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Agent flow platform" className="inline-flex flex-wrap rounded-lg border bg-muted p-1">
          {AGENT_FLOWS.map((v) => <button key={v.id} type="button" aria-pressed={view.id === v.id} onClick={() => chooseView(v.id)} className={cn("rounded-md px-3.5 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", view.id === v.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{v.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails} aria-controls="flow-details">
            {showDetails ? <PanelRightClose className="size-4" aria-hidden="true" /> : <PanelRightOpen className="size-4" aria-hidden="true" />}{showDetails ? "Hide details" : "Show details"}
          </Button>
          <Button ref={expandButton} variant="outline" size="sm" onClick={() => setExpanded(true)}><Maximize2 className="size-4" aria-hidden="true" />Expand diagram</Button>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{view.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{view.summary}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm"><span>Focus</span>
          <select value={selected ?? ""} onChange={(e) => setSelected(e.target.value || null)} className="h-9 max-w-[min(70vw,340px)] rounded-md border bg-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Full runtime flow</option>
            {view.nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
        </label>
        {selected && <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><RotateCcw className="size-3.5" aria-hidden="true" />Reset focus</Button>}
      </div>
      <div className={cn("grid gap-4", showDetails && "2xl:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="min-w-0 overflow-x-auto rounded-xl border" style={{ background: pal.canvas }}>
          <FlowDiagram view={view} selected={selected} onSelect={setSelected} />
        </div>
        {showDetails && <div id="flow-details"><FlowDetails item={item} view={view} /></div>}
      </div>
      <Legend />
      <p className="text-xs text-muted-foreground">Policy and coverage connections appear when their control is selected; they are not extra hops in the runtime path.</p>
      <details className="rounded-lg border bg-card p-3">
        <summary className="cursor-pointer text-sm font-semibold">Coverage limits and Microsoft Learn references</summary>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{view.scope}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {sources.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4">{s.label}<ExternalLink className="size-3" aria-hidden="true" /></a></li>)}
        </ul>
      </details>
      <details className="rounded-lg border bg-card p-3">
        <summary className="cursor-pointer text-sm font-semibold">Connection list</summary>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {view.edges.map((e) => <li key={e.id}><span className="font-medium">{view.nodes.find((n) => n.id === e.from)?.title} → {view.nodes.find((n) => n.id === e.to)?.title}</span><span className="text-muted-foreground"> · {CONNECTION_STYLES[e.kind].label}{e.label ? ` · ${e.label}` : ""}</span></li>)}
        </ul>
      </details>
      <FlowArchitectureCoverage key={view.id} view={view} />
      <ContentReview tab="flows" />
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); expandButton.current?.focus(); }} className="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none content-start p-4 sm:max-w-none">
          <DialogHeader className="pr-8"><DialogTitle>{view.title}</DialogTitle><DialogDescription>{view.summary}</DialogDescription></DialogHeader>
          <div className="min-w-0 overflow-x-auto rounded-xl" style={{ background: pal.canvas }}><FlowDiagram view={view} selected={selected} onSelect={setSelected} /></div>
          <Legend />
          <p className="text-sm text-muted-foreground">{view.scope}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
