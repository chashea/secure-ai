import { REF, REF_DIAGRAM, type RefLink } from "@/lib/content";

export type ReferenceMode = "traffic" | "coverage" | "integrations";
export type RelationshipKind = "protects" | "observes" | "works";
export interface ArchitectureRelationship { id: string; kind: RelationshipKind; how: string; sources?: RefLink["sources"] }
export const REFERENCE_MODES: { id: ReferenceMode; label: string }[] = [
  { id: "traffic", label: "Traffic paths" },
  { id: "coverage", label: "Security coverage" },
  { id: "integrations", label: "Integrations" },
];
export const REFERENCE_PRODUCTS = REF.pillars.flatMap((pillar) => pillar.products.map((p) => ({ ...p, pillar: pillar.label })));
export const REFERENCE_SURFACES = REF.layers.flatMap((layer) => layer.surfaces.map((s) => ({ ...s, layer: layer.label })));
export const PRODUCT_BY_ID = Object.fromEntries(REFERENCE_PRODUCTS.map((p) => [p.id, p]));
export const SURFACE_BY_ID = Object.fromEntries(REFERENCE_SURFACES.map((s) => [s.id, s]));
export const REFERENCE_ENTRIES = Object.fromEntries([...REFERENCE_SURFACES, ...REFERENCE_PRODUCTS].map((e) => [e.id, e]));

export function integrationsFor(id: string): RefLink[] {
  const own = PRODUCT_BY_ID[id]?.works ?? [];
  const incoming = REFERENCE_PRODUCTS.filter((p) => p.id !== id && p.works.some((w) => w.id === id) && !own.some((w) => w.id === p.id))
    .map((p) => ({ ...p.works.find((w) => w.id === id)!, id: p.id }));
  return [...own, ...incoming];
}
export function relationshipsFor(id: string | null, mode: ReferenceMode): ArchitectureRelationship[] {
  if (!id || mode === "traffic") return [];
  if (mode === "integrations") return integrationsFor(id).map((l) => ({ ...l, kind: "works" }));
  const p = PRODUCT_BY_ID[id];
  if (p) return p.protects.map((l) => ({ ...l, kind: l.kind === "observe" ? "observes" : "protects" }));
  return REFERENCE_PRODUCTS.flatMap((product) => product.protects.filter((l) => l.id === id)
    .map((l) => ({ ...l, id: product.id, kind: l.kind === "observe" ? "observes" as const : "protects" as const })));
}

const at = ([x, y]: [number, number]) => REF_DIAGRAM.nodes.find((n) =>
  x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h)?.ref;
const signature = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");
const seen = new Set<string>();
export const ARCHITECTURE_WIRES = REF_DIAGRAM.wires.flatMap((w, i) => {
  const sig = `${w.style}:${signature(w.pts)}`;
  const reverse = `${w.style}:${signature([...w.pts].reverse())}`;
  if (seen.has(sig) || seen.has(reverse)) return [];
  seen.add(sig);
  return [{ ...w, id: `wire-${i}`, from: at(w.pts[0]), to: at(w.pts[w.pts.length - 1]) }];
});

/** Logical configured paths. Configuration and monitoring edges never become traffic hops. */
export const ARCHITECTURE_JOURNEYS = [
  ["employees", "gsa", "copilot", "m365data"],
  ["employees", "gsa", "thirdparty", "m365data"],
  ["employees", "gsa", "shadowai"],
  ["employees", "gsa", "mcp"],
  ["local", "gsa", "mcp"],
  ["builders", "gsa", "studio", "gsaagents", "mcp"],
  ["builders", "gsa", "studio", "gsaagents", "connectors"],
  ["builders", "gsa", "studio", "models"],
  ["employees", "gsa", "foundry", "aigw", "models"],
  ["employees", "gsa", "foundry", "aigw", "mcp"],
  ["builders", "gsa", "foundry", "aigw", "models"],
  ["builders", "gsa", "foundry", "aigw", "mcp"],
  ["partners", "aigw", "foundry"],
];
export const isTrafficStyle = (style: string) => ["solid", "direct", "shadow"].includes(style);
export function trafficFocus(id: string | null) {
  const nodes = new Set<string>();
  const wires = new Set<string>();
  if (!id) return { nodes, wires };
  nodes.add(id);
  for (const journey of ARCHITECTURE_JOURNEYS.filter((j) => j.includes(id))) {
    journey.forEach((ref) => nodes.add(ref));
    for (let i = 1; i < journey.length; i++) {
      for (const w of ARCHITECTURE_WIRES.filter((w) => isTrafficStyle(w.style) && w.from === journey[i - 1] && w.to === journey[i])) wires.add(w.id);
    }
  }
  // Explicit policy/signal selections retain their own semantics, never white traffic styling.
  if (!wires.size) for (const w of ARCHITECTURE_WIRES.filter((w) => w.from === id || w.to === id)) {
    wires.add(w.id); if (w.from) nodes.add(w.from); if (w.to) nodes.add(w.to);
  }
  return { nodes, wires };
}

export const RELATIONSHIP_STYLE: Record<RelationshipKind, { color: string; dash?: string; label: string }> = {
  protects: { color: "#2EC4B6", label: "Protection / governance" },
  observes: { color: "#9FC6EA", dash: "2 5", label: "Discovery / monitoring" },
  works: { color: "#FFC857", dash: "6 5", label: "Integration / dependency" },
};
export const ARCHITECTURE_LINE_STYLE: Record<string, { color: string; dash?: string; label: string }> = {
  solid: { color: "#5B7FAD", label: "Configured traffic" },
  direct: { color: "#9FC6EA", dash: "2 4", label: "Direct service path" },
  shadow: { color: "#FF8A3D", dash: "6 4", label: "Shadow AI traffic" },
  governs: { color: "#B48CFF", dash: "5 3", label: "Policy / configuration" },
  plane: { color: "#519B95", label: "Security layers / signals" },
};
export const WORKLOAD_FOCUS = [
  { id: "copilot", label: "Microsoft Copilot" },
  { id: "studio", label: "Copilot Studio" },
  { id: "foundry", label: "Foundry" },
  { id: "thirdparty", label: "Third-party AI" },
  { id: "shadowai", label: "Shadow AI" },
];

/** Short labels change presentation only; descriptions and relationships remain canonical. */
export const NODE_COPY: Record<string, { title?: string; sub?: string }> = {
  partners: { sub: "Guests · A2A callers" },
  copilot: { sub: "Licensed Copilot and Copilot Chat" },
  foundry: { title: "Foundry agents & AI apps", sub: "Configured model and tool paths" },
  gsaagents: { title: "Secure Web & AI GW", sub: "Studio egress" },
  gsa: { sub: "Configured traffic|Internet + Microsoft 365|Web filtering|Prompt inspection|Purview inspection|Remote MCP (preview)" },
  aigw: { title: "APIM AI gateway", sub: "Configured calls|Model policies|Eligible MCP (preview)" },
  dspm: { sub: "Risk insights & remediation" },
  a365: { sub: "Inventory & platform governance" },
  rtap: { sub: "Runtime checks · preview" },
};

export function wrapArchitectureLabel(text: string, room: number, size: number, bold = false) {
  const lines: string[] = []; let line = "";
  const factor = bold ? 0.55 : 0.51;
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length * size * factor > room) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
