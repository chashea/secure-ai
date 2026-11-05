import { useId, useRef, useState } from "react";
import { ExternalLink, Maximize2, PanelRightClose, PanelRightOpen, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PdfExportButton } from "@/components/pdf-export-button";
import { ContentReview } from "@/components/content-review";
import { REF, REF_DIAGRAM, type RefNode } from "@/lib/content";
import { cn } from "@/lib/utils";
import { useDiagramPalette, type DiagramPalette } from "@/lib/diagram-palette";
import {
  ARCHITECTURE_LINE_STYLE, ARCHITECTURE_WIRES, NODE_COPY, PRODUCT_BY_ID, REFERENCE_ENTRIES,
  REFERENCE_MODES, RELATIONSHIP_STYLE, WORKLOAD_FOCUS, isTrafficStyle, relationshipsFor, trafficFocus,
  wrapArchitectureLabel, type ArchitectureRelationship, type ReferenceMode,
} from "@/lib/reference-architecture-model";

const points = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");
const center = (n: RefNode) => [n.x + n.w / 2, n.y + n.h / 2] as [number, number];
const curve = (a: RefNode, b: RefNode) => {
  const [x1, y1] = center(a); const [x2, y2] = center(b);
  const dx = x2 - x1; const dy = y2 - y1; const length = Math.hypot(dx, dy) || 1;
  const bend = Math.min(110, length / 5);
  return `M${x1},${y1} Q${(x1+x2)/2-dy/length*bend},${(y1+y2)/2+dx/length*bend} ${x2},${y2}`;
};
function NodeLabel({ n, pal }: { n: RefNode; pal: DiagramPalette }) {
  const copy = NODE_COPY[n.ref];
  const title = copy?.title ?? n.title;
  const subs = (copy?.sub ?? n.sub).split("|").filter(Boolean);
  const small = n.w < 200;
  const titleSize = small ? 15.5 : n.h <= 64 ? 16 : 18;
  const room = n.w - 28;
  const lines = [
    ...wrapArchitectureLabel(title, room, titleSize, true).map((t) => ({ t, size: titleSize, height: titleSize + 2, bold: true })),
    ...subs.flatMap((t) => wrapArchitectureLabel(t, room, 13).map((text) => ({ t: text, size: 13, height: 16, bold: false }))),
  ];
  const height = lines.reduce((sum, l) => sum + l.height, 0);
  let y = n.y + (n.h - height) / 2;
  return <g pointerEvents="none" textAnchor={n.align === "c" ? "middle" : "start"}>
    {lines.map((l, i) => { y += l.height; return <text key={i} x={n.align === "c" ? n.x + n.w / 2 : n.x + 14} y={y - 4} fill={l.bold ? pal.nodeTitle : pal.nodeSub} fontSize={l.size} fontWeight={l.bold ? 700 : 400}>{l.t}</text>; })}
  </g>;
}

export function CustomerArchitectureDiagram({ focus, mode, onPick }: {
  focus: string | null; mode: ReferenceMode; onPick: (id: string) => void;
}) {
  const uid = useId();
  const pal = useDiagramPalette();
  const traffic = trafficFocus(focus);
  const relationships = relationshipsFor(focus, mode);
  const related = new Map(relationships.map((r) => [r.id, r]));
  const from = REF_DIAGRAM.nodes.find((n) => n.ref === focus);
  return (
    <svg viewBox={REF_DIAGRAM.viewBox} className="customer-architecture block h-auto w-full min-w-[1280px]" role="group" aria-labelledby={`${uid}-title ${uid}-desc`} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <title id={`${uid}-title`}>AI security reference architecture</title>
      <desc id={`${uid}-desc`}>Identity and access above configured AI traffic paths. Data protection, threat protection and agent governance below. Defender XDR and Sentinel connect security operations. Traffic, enforcement, discovery and integrations are distinct.</desc>
      <rect width={1600} height={1020} fill={pal.canvas} />
      {REF_DIAGRAM.frames.map((f, i) => <g key={i}>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={14} fill={f.tone === "ops" ? pal.opsFrame : pal.frame} stroke={f.tone === "ops" ? pal.opsFrameStroke : pal.frameStroke} />
        {f.label && <text x={f.lx} y={f.ly} fill={pal.frameLabel} fontSize={14} fontWeight={700} letterSpacing={1}>{f.label}</text>}
      </g>)}
      {REF_DIAGRAM.labels.map((l) => <text key={l.t} x={l.x} y={l.y} fill={pal.sectionLabel} fontSize={13} fontWeight={l.small ? 400 : 700} letterSpacing={l.small ? 0 : 1}>{l.small ? "Policies apply where configured" : l.t}</text>)}
      {ARCHITECTURE_WIRES.map((w) => {
        const st = ARCHITECTURE_LINE_STYLE[w.style];
        const selected = mode === "traffic" && focus !== null && traffic.wires.has(w.id);
        const quiet = mode !== "traffic" || (focus !== null && !selected);
        return <g key={w.id}>
          <polyline data-reference-wire={w.id} points={points(w.pts)} fill="none" stroke={selected && ["solid","direct"].includes(w.style) ? pal.selected : pal.line(st.color)} strokeWidth={selected ? 3 : 2} strokeDasharray={st.dash} strokeLinejoin="round" strokeLinecap="round" opacity={quiet ? 0.22 : 1} />
          {!quiet && w.label && <text x={w.lx} y={w.ly} textAnchor={w.style === "plane" && !w.label.includes("sync") ? "start" : "middle"} fill={pal.wireLabel} fontSize={13} fontWeight={selected ? 700 : 400}>{w.label}</text>}
        </g>;
      })}
      {from && relationships.map((r) => {
        const to = REF_DIAGRAM.nodes.find((n) => n.ref === r.id); if (!to) return null;
        const st = RELATIONSHIP_STYLE[r.kind];
        return <path key={r.id} data-reference-relationship={`${focus}:${r.id}`} data-relationship-kind={r.kind} d={curve(from, to)} fill="none" stroke={pal.line(st.color)} strokeWidth={2.5} strokeDasharray={st.dash} />;
      })}
      {REF_DIAGRAM.nodes.map((n) => {
        const style = pal.nodes[n.kind] ?? pal.nodes[""];
        const selected = focus === n.ref;
        const relation = related.get(n.ref);
        const onPath = mode === "traffic" && traffic.nodes.has(n.ref);
        const active = selected || relation || onPath;
        const border = selected ? pal.selected : relation ? pal.line(RELATIONSHIP_STYLE[relation.kind].color) : onPath ? pal.onPath : style.border;
        return <g key={n.id}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.kind === "gw" ? 14 : 10} fill={focus && !active ? pal.dimFill : style.fill} stroke={border} strokeWidth={active ? 3 : 1.25} strokeDasharray={relation ? RELATIONSHIP_STYLE[relation.kind].dash : n.kind === "shadow" ? "6 4" : undefined} />
          <NodeLabel n={n} pal={pal} />
          <foreignObject data-pdf-exclude x={n.x} y={n.y} width={n.w} height={n.h}>
            <button type="button" data-reference-node={n.ref} aria-label={REFERENCE_ENTRIES[n.ref]?.title ?? n.title} aria-pressed={selected} onClick={() => onPick(n.ref)} className={`reference-node-button block h-full w-full rounded-lg bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${pal.focusRing}`}><span className="sr-only">{n.title}</span></button>
          </foreignObject>
        </g>;
      })}
    </svg>
  );
}

function Legend({ mode }: { mode: ReferenceMode }) {
  const pal = useDiagramPalette();
  const items = mode === "traffic" ? Object.values(ARCHITECTURE_LINE_STYLE) : mode === "coverage" ? [RELATIONSHIP_STYLE.protects, RELATIONSHIP_STYLE.observes] : [RELATIONSHIP_STYLE.works];
  return <ul aria-label="Connection legend" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
    {items.map((st) => <li key={st.label} className="flex items-center gap-2"><svg width={32} height={12} aria-hidden="true"><line x1={0} y1={6} x2={32} y2={6} stroke={pal.line(st.color)} strokeWidth={2.5} strokeDasharray={st.dash} /></svg>{st.label}</li>)}
    {mode === "traffic" && <li>{pal.selectedName} lines show the selected traffic path. Orange is shadow AI—not a blocking verdict.</li>}
  </ul>;
}
function RelationshipList({ rows, onPick }: { rows: ArchitectureRelationship[]; onPick: (id: string) => void }) {
  return <ul className="flex flex-col gap-3">{rows.map((r) => <li key={`${r.kind}-${r.id}`}>
    <button type="button" onClick={() => onPick(r.id)} className="text-left text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{REFERENCE_ENTRIES[r.id]?.title ?? r.id}</button>
    <p className="text-xs font-medium text-muted-foreground">{RELATIONSHIP_STYLE[r.kind].label}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.how}</p>
    {!!r.sources?.length && <ul aria-label="Relationship references" className="mt-2 flex flex-col gap-1.5">
      {r.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-xs text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{source.label}<ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" /></a></li>)}
    </ul>}
  </li>)}</ul>;
}
function ComponentDetails({ focus, mode, onPick }: { focus: string | null; mode: ReferenceMode; onPick: (id: string) => void }) {
  const entry = focus ? REFERENCE_ENTRIES[focus] : null;
  const rows = relationshipsFor(focus, mode === "traffic" ? "coverage" : mode);
  return <aside aria-label="Architecture component details" className="min-w-0 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{focus && PRODUCT_BY_ID[focus] ? PRODUCT_BY_ID[focus].pillar : "Workload scope"}</p>
    <h3 className="mt-1 font-semibold">{entry?.title ?? "Architecture overview"}</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry?.desc ?? REF.scopeNote}</p>
    {!!rows.length && <div className="mt-4 border-t pt-3"><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mode === "integrations" ? "Integrations and dependencies" : "Documented coverage"}</h4><RelationshipList rows={rows} onPick={onPick} /></div>}
  </aside>;
}

export function ReferenceArchitecture() {
  const pal = useDiagramPalette();
  const [focus, setFocus] = useState<string | null>(null);
  const [mode, setMode] = useState<ReferenceMode>("traffic");
  const [details, setDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState(true);
  const captureRef = useRef<HTMLElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const detailsButton = useRef<HTMLButtonElement>(null);
  const closeDetailsButton = useRef<HTMLButtonElement>(null);
  const title = focus ? REFERENCE_ENTRIES[focus]?.title : "All workloads";
  const modeLabel = REFERENCE_MODES.find((m) => m.id === mode)!.label;
  const select = (id: string) => {
    setFocus(id);
    const product = PRODUCT_BY_ID[id];
    const coverage = relationshipsFor(id, "coverage");
    const hasTraffic = ARCHITECTURE_WIRES.some((w) => isTrafficStyle(w.style) && (w.from === id || w.to === id));
    if (mode === "integrations" && !product) setMode("coverage");
    else if (product && ((mode === "traffic" && !hasTraffic) || (mode === "coverage" && !coverage.length))) setMode(coverage.length ? "coverage" : "integrations");
  };
  const reset = () => { setFocus(null); setMode("traffic"); };
  return <div className="flex flex-col gap-4">
    <div data-pdf-exclude className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Workload focus" className="flex flex-wrap gap-1.5">
        <Button variant={!focus ? "secondary" : "ghost"} size="sm" aria-pressed={!focus} onClick={reset}>All workloads</Button>
        {WORKLOAD_FOCUS.map((w) => <Button key={w.id} variant={focus === w.id ? "secondary" : "ghost"} size="sm" aria-pressed={focus === w.id} onClick={() => select(w.id)}>{w.label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={details} onOpenChange={setDetails} modal={false}>
          <PopoverTrigger asChild>
            <Button ref={detailsButton} variant="outline" size="sm">{details ? <PanelRightClose className="size-4" aria-hidden="true" /> : <PanelRightOpen className="size-4" aria-hidden="true" />}{details ? "Hide details" : "Show details"}</Button>
          </PopoverTrigger>
          <PopoverContent
            data-pdf-exclude
            align="end"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
            aria-label="Architecture details"
            onInteractOutside={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => { event.preventDefault(); closeDetailsButton.current?.focus({ preventScroll: true }); }}
            onCloseAutoFocus={(event) => { event.preventDefault(); if (!expanded) detailsButton.current?.focus({ preventScroll: true }); }}
            className="flex max-h-[min(75dvh,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Component details</h3>
              <Button ref={closeDetailsButton} variant="ghost" size="icon" aria-label="Close details" onClick={() => setDetails(false)}><X className="size-4" aria-hidden="true" /></Button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <ComponentDetails focus={focus} mode={mode} onPick={select} />
            </div>
          </PopoverContent>
        </Popover>
        <Button ref={expandButton} variant="outline" size="sm" onClick={() => { setDetails(false); setExpanded(true); }}><Maximize2 className="size-4" aria-hidden="true" />Expand</Button>
        <PdfExportButton targetRef={captureRef} fileName="AI-Security-Reference-Architecture.pdf" options={{ expandContainers: true, orientation: "landscape", paperSize: "letter", marginPoints: 24 }}>Download PDF</PdfExportButton>
      </div>
    </div>
    <div data-pdf-exclude className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Connection view" className="inline-flex rounded-lg border bg-muted p-1">
        {REFERENCE_MODES.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} disabled={m.id !== "traffic" && (!focus || (m.id === "integrations" && !PRODUCT_BY_ID[focus]))} onClick={() => setMode(m.id)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", mode === m.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{m.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><span>Component</span><select value={focus ?? ""} onChange={(e) => e.target.value ? select(e.target.value) : reset()} className="h-9 max-w-[min(68vw,320px)] rounded-md border bg-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">All workloads</option>{REF.layers.map((l) => <optgroup key={l.id} label={l.label}>{l.surfaces.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}{REF.pillars.map((p) => <optgroup key={p.id} label={p.label}>{p.products.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sources} onChange={(e) => setSources(e.target.checked)} />Include references</label>
        {focus && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="size-3.5" aria-hidden="true" />Reset</Button>}
      </div>
    </div>
    <div className="min-w-0">
      <section ref={captureRef} data-customer-architecture aria-label="Customer architecture view" className="min-w-0 rounded-xl border bg-card p-4 text-foreground" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <header className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Microsoft AI security · Logical reference design</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">AI security reference architecture</h2>
          <p className="mt-1 text-sm text-muted-foreground">How access, network controls, data protection and monitoring connect across AI apps and agents.</p>
          <p className="mt-2 text-xs font-semibold">{modeLabel} · {title}</p>
        </header>
        <div data-pdf-expand className="min-w-0 overflow-x-auto rounded-lg" style={{ background: pal.canvas }}><CustomerArchitectureDiagram focus={focus} mode={mode} onPick={select} /></div>
        <div className="mt-3"><Legend mode={mode} /></div>
        <section className="mt-4 border-t pt-3" aria-label="Deployment scope and limits">
          <h3 className="text-sm font-semibold">Deployment scope and limits</h3>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>Lines show example configured paths, not automatic routing or universal inspection. Authoring, runtime and security operations are distinct activities.</li>
            <li>Discovery and registry synchronization are not runtime blocking. Enforcement requires the supported integration and an applicable policy.</li>
            <li>Validate preview status, licensing, target-cloud availability and gateway-specific capabilities before deployment.</li>
          </ul>
        </section>
        {sources && <section className="mt-4 border-t pt-3" aria-label="Microsoft Learn source references"><h3 className="text-sm font-semibold">Microsoft Learn source references</h3><ul className="mt-2 grid gap-x-5 gap-y-3 sm:grid-cols-2">{REF.sources.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">{s.label}<ExternalLink data-pdf-exclude className="size-3" aria-hidden="true" /></a><p className="mt-0.5 break-all text-[11px] leading-relaxed text-muted-foreground">{s.href}</p></li>)}</ul></section>}
      </section>
    </div>
    <p className="text-xs text-muted-foreground">Download PDF captures the visible architecture, selected connection view, limits and included references. Sharing a PDF does not grant access to the app.</p>
    <details className="rounded-lg border bg-card p-3"><summary className="cursor-pointer text-sm font-semibold">Accessible connection list</summary><div className="mt-2">{mode === "traffic" ? <ul className="flex flex-col gap-2 text-sm">{ARCHITECTURE_WIRES.filter((w) => w.from && w.to).map((w) => <li key={w.id}>{REFERENCE_ENTRIES[w.from!]?.title} — {REFERENCE_ENTRIES[w.to!]?.title}<span className="text-muted-foreground"> · {ARCHITECTURE_LINE_STYLE[w.style].label}{w.label ? ` · ${w.label}` : ""}</span></li>)}</ul> : <RelationshipList rows={relationshipsFor(focus, mode)} onPick={select} />}</div></details>
    <ContentReview tab="reference" />
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent onCloseAutoFocus={(e) => { e.preventDefault(); expandButton.current?.focus(); }} className="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none content-start p-4 sm:max-w-none"><DialogHeader className="pr-8"><DialogTitle>AI security reference architecture</DialogTitle><DialogDescription>{modeLabel} · {title}</DialogDescription></DialogHeader><div className="min-w-0 overflow-x-auto rounded-xl" style={{ background: pal.canvas }}><CustomerArchitectureDiagram focus={focus} mode={mode} onPick={select} /></div><Legend mode={mode} /><p className="text-xs text-muted-foreground">{REF.scopeNote}</p></DialogContent></Dialog>
  </div>;
}
