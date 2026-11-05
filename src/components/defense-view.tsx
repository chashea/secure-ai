import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DEFENSE } from "@/lib/content";
import { ContentReview } from "@/components/content-review";

const SECTIONS = [
  { id: "principles", label: "Principles" },
  { id: "layers", label: "Seven layers" },
  { id: "paths", label: "AI paths" },
  { id: "interaction", label: "One interaction" },
  { id: "matrix", label: "Threat matrix" },
  { id: "detection", label: "Detection & response" },
  { id: "boundaries", label: "Boundaries" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

function Head({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{kicker}</p>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function NumberedCards({ items, cols }: { items: readonly { title: string; text: string }[]; cols: string }) {
  return (
    <ol className={cn("grid gap-3", cols)}>
      {items.map((it, i) => (
        <li key={it.title} className="flex gap-3 rounded-xl border bg-card p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{it.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function WideTable({ heads, rows, firstWidth, minWidth }: {
  heads: readonly string[]; rows: readonly (readonly string[])[]; firstWidth: string; minWidth: string;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <Table className={cn("table-fixed", minWidth)}>
        <TableHeader>
          <TableRow>
            {heads.map((h, i) => (
              <TableHead key={h} className={cn("h-auto whitespace-normal py-3 align-bottom text-xs font-semibold uppercase tracking-wide text-foreground", i === 0 && firstWidth)}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r[0]} className="hover:bg-transparent">
              {r.map((c, i) =>
                i === 0 ? (
                  <TableHead key={i} scope="row" className="h-auto whitespace-normal py-3 align-top font-semibold text-foreground">{c}</TableHead>
                ) : (
                  <TableCell key={i} className="whitespace-normal py-3 align-top text-sm leading-relaxed">{c}</TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Paths({ onOpen }: { onOpen: (tab: string, view: string) => void }) {
  const P = DEFENSE.paths;
  return (
    <div className="flex flex-col gap-4">
      <Head kicker={P.kicker} title={P.title} sub={P.sub} />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {P.items.map((it) => (
          <li key={it.title} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <p className="font-semibold leading-snug">{it.title}</p>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{it.summary}</p>
            <button
              type="button"
              onClick={() => onOpen(it.tab, it.view)}
              className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {it.link}<ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
        <li className="flex flex-col gap-2 rounded-xl border border-primary/60 bg-primary/10 p-4 md:col-span-2 xl:col-span-3">
          <p className="font-semibold leading-snug">{P.third.title}</p>
          <dl className="grid gap-3 md:grid-cols-3">
            {P.third.cells.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-primary">{k}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </li>
      </ul>
    </div>
  );
}

function Layers() {
  const L = DEFENSE.layers;
  return (
    <div className="flex flex-col gap-4">
      <Head kicker={L.kicker} title={L.title} sub={L.sub} />
      <ol className="flex flex-col gap-2">
        {L.items.map((layer, i) => (
          <li key={layer.label} className={cn("grid gap-2 rounded-xl border p-2.5 md:grid-cols-[180px_repeat(3,minmax(0,1fr))]", i === L.items.length - 1 ? "bg-primary/10" : "bg-card")}>
            <div className="px-1.5 py-1">
              <p className="font-semibold">
                <span className="text-primary">{i + 1}</span> · {layer.label}
              </p>
              <p className="text-xs text-muted-foreground">{layer.sub}</p>
            </div>
            {layer.products.map((p) => (
              <div key={p.title} className={cn("rounded-lg border px-3 py-2", p.inline ? "border-primary/60 bg-primary/10" : "bg-background")}>
                <p className="text-sm font-semibold leading-snug">{p.title}</p>
                <p className="text-xs leading-snug text-muted-foreground">{p.sub}</p>
              </div>
            ))}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border border-primary/60 bg-primary/10" aria-hidden="true" />Can enforce when supported and configured</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border bg-background" aria-hidden="true" />Governs or observes</span>
        <span>{L.preview}</span>
      </div>
    </div>
  );
}

function Interaction() {
  const X = DEFENSE.interaction;
  return (
    <div className="flex flex-col gap-4">
      <Head kicker={X.kicker} title={X.title} sub={X.sub} />
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {X.steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-primary bg-primary/10 px-3 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
              {i < X.steps.length - 1 && <ArrowRight className="hidden size-4 shrink-0 text-primary xl:block" aria-hidden="true" />}
            </div>
            {s.checks.map(([t, sub]) => (
              <div key={t} className="rounded-lg border bg-card px-3 py-2">
                <p className="text-sm font-semibold leading-snug">{t}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </li>
        ))}
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-l-4 border-orange-400 bg-orange-50 p-4 dark:border-orange-400 dark:bg-orange-900/40">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-200">
            <AlertTriangle className="size-3.5" aria-hidden="true" />What could go wrong
          </p>
          <p className="mt-2 text-sm leading-relaxed text-orange-950 dark:text-orange-50">{X.wrong}</p>
        </div>
        <div className="rounded-xl border border-l-4 border-primary bg-primary/10 p-4 dark:bg-primary/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />Where controls can intervene
          </p>
          <p className="mt-2 text-sm leading-relaxed">{X.caught}</p>
        </div>
      </div>
    </div>
  );
}

function Detection() {
  const Dt = DEFENSE.detection;
  return (
    <div className="flex flex-col gap-4">
      <Head kicker={Dt.kicker} title={Dt.title} sub={Dt.sub} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)] lg:items-center">
        <ul className="flex flex-col gap-2" aria-label="Signal sources">
          {Dt.sources.map(([t, sub]) => (
            <li key={t} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-sm font-semibold leading-snug">{t}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </li>
          ))}
        </ul>
        <ArrowRight className="mx-auto hidden size-6 text-primary lg:block" aria-hidden="true" />
        <div className="grid gap-3 md:grid-cols-2">
          {Dt.hubs.map((h) => (
            <div key={h.title} className="rounded-xl border border-primary/60 bg-primary/10 p-4">
              <p className="font-semibold">{h.title}</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed">
                {h.items.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Respond at the layer that owns the control</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Dt.respond.map(([who, what]) => (
            <li key={who} className="text-sm"><span className="font-semibold">{who}:</span> {what}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DefenseView({ onOpen }: { onOpen: (tab: string, view: string) => void }) {
  const [section, setSection] = useState<SectionId>("principles");
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{DEFENSE.kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{DEFENSE.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{DEFENSE.sub}</p>
      </div>
      <div role="group" aria-label="Section" className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={section === s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              section === s.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === "principles" && (
        <div className="flex flex-col gap-4">
          <Head kicker={DEFENSE.principles.kicker} title={DEFENSE.principles.title} sub={DEFENSE.principles.sub} />
          <NumberedCards items={DEFENSE.principles.items} cols="md:grid-cols-2 xl:grid-cols-3" />
        </div>
      )}
      {section === "layers" && <Layers />}
      {section === "paths" && <Paths onOpen={onOpen} />}
      {section === "interaction" && <Interaction />}
      {section === "matrix" && (
        <div className="flex flex-col gap-4">
          <Head kicker={DEFENSE.matrix.kicker} title={DEFENSE.matrix.title} sub={DEFENSE.matrix.sub} />
          <WideTable heads={DEFENSE.matrix.heads} rows={DEFENSE.matrix.rows} firstWidth="w-44" minWidth="min-w-[1000px]" />
        </div>
      )}
      {section === "detection" && <Detection />}
      {section === "boundaries" && (
        <div className="flex flex-col gap-4">
          <Head kicker={DEFENSE.boundaries.kicker} title={DEFENSE.boundaries.title} sub={DEFENSE.boundaries.sub} />
          <NumberedCards items={DEFENSE.boundaries.items} cols="md:grid-cols-2" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{DEFENSE.status}</p>
      <ContentReview tab="defense" />
    </div>
  );
}
