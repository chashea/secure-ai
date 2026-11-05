import { FLOW_SOURCES, type AgentFlow, type FlowNode } from "@/lib/agent-flow-content";
import { REFERENCE_PRODUCTS, REFERENCE_ENTRIES, integrationsFor } from "@/lib/reference-architecture-model";
import type { RefLink, RefSource } from "@/lib/content";

export interface FlowArchitectureRow {
  product: (typeof REFERENCE_PRODUCTS)[number];
  representation: "diagram" | "shared" | "other";
  diagramNodes: FlowNode[];
  links: RefLink[];
  integrations: RefLink[];
  scopeNote?: string;
}

/** Canonical architecture relationships remain the authority; the flow only selects its subjects. */
export function architectureCoverageFor(view: AgentFlow): FlowArchitectureRow[] {
  const subjects = new Set(view.referenceSubjects);
  const rows: FlowArchitectureRow[] = REFERENCE_PRODUCTS.map((product) => {
    const diagramNodes = view.nodes.filter((node) => node.refs.includes(product.id));
    // A shared human persona is not enough to extend a platform-specific policy to another runtime.
    const platformScopeMatches = product.id !== "ppac" || view.workloads.includes("studio") || diagramNodes.length > 0;
    const links = platformScopeMatches ? product.protects.filter((link) => subjects.has(link.id)) : [];
    return {
      product,
      representation: diagramNodes.length ? "diagram" : links.length ? "shared" : "other",
      diagramNodes,
      links,
      integrations: [],
      scopeNote: !platformScopeMatches
        ? "Power Platform data policies govern Studio and Power Platform connectivity. No Power Platform integration is illustrated in this flow; they do not govern native Foundry tools or local commands by themselves."
        : undefined,
    };
  });
  const relevant = new Set(rows.filter((row) => row.representation !== "other").map((row) => row.product.id));
  return rows.map((row) => ({
    ...row,
    integrations: integrationsFor(row.product.id).filter((link) => relevant.has(link.id)),
  }));
}

export function referenceTitle(id: string): string {
  return REFERENCE_ENTRIES[id]?.title ?? id;
}

const PRODUCT_REFERENCES: Record<string, RefSource[]> = {
  idp: [
    { label: "ID Protection for agents", href: "https://learn.microsoft.com/en-us/entra/id-protection/concept-risky-agents" },
    { label: "Conditional Access for agents", href: "https://learn.microsoft.com/en-us/entra/identity/conditional-access/agent-id" },
  ],
  aispm: [
    { label: "Overview - AI security posture management", href: "https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-security-posture" },
    { label: "Transition Microsoft Copilot Studio and Microsoft Foundry agent security capabilities to Microsoft Agent 365", href: "https://learn.microsoft.com/en-us/defender-xdr/security-for-ai/transition-agent-security-to-agent-365" },
  ],
  sentinel: [{ label: "Microsoft Defender XDR integration with Microsoft Sentinel", href: "https://learn.microsoft.com/en-us/azure/sentinel/microsoft-365-defender-sentinel-integration" }],
  mdca: [{ label: "Govern discovered apps in Microsoft Defender for Cloud Apps", href: "https://learn.microsoft.com/en-us/defender-cloud-apps/governance-discovery" }],
};

export function coverageSourcesFor(row: FlowArchitectureRow): RefSource[] {
  return uniqueSources([
    ...(PRODUCT_REFERENCES[row.product.id] ?? []),
    ...[...row.links, ...row.integrations].flatMap((link) => link.sources ?? []),
  ]);
}

export function flowSourcesFor(view: AgentFlow): RefSource[] {
  const direct = FLOW_SOURCES.filter((source) => view.sourceLabels.includes(source.label));
  const contextual = architectureCoverageFor(view)
    .filter((row) => row.representation !== "other")
    .flatMap(coverageSourcesFor);
  return uniqueSources([...direct, ...contextual]);
}

function uniqueSources(sources: RefSource[]): RefSource[] {
  return [...new Map(sources.map((source) => [source.href, source])).values()];
}
