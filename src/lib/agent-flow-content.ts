import { REF } from "@/lib/content";

export type FlowPoint = [number, number];
export type ConnectionKind = "traffic" | "direct" | "governs" | "protects" | "observes";
export interface FlowNode {
  id: string; title: string; sub: string; x: number; y: number; w: number; h: number;
  role: "actor" | "service" | "gateway" | "resource" | "control";
  refs: string[]; note?: string;
}
export interface FlowConnection {
  id: string; from: string; to: string; kind: ConnectionKind; points: FlowPoint[];
  label?: string; at?: FlowPoint;
}
export interface RuntimeRoute { id: string; nodes: string[]; edges: string[] }
export interface AgentFlow {
  id: string; label: string; title: string; summary: string; scope: string;
  defaultNode: string; nodes: FlowNode[]; edges: FlowConnection[]; routes: RuntimeRoute[]; sourceLabels: string[];
  workloads: string[]; referenceSubjects: string[]; headings?: [string, string, string, string];
}
export const FLOW_VIEWBOX = "0 0 1200 690";
export const CONNECTION_STYLES: Record<ConnectionKind, { color: string; dash?: string; label: string }> = {
  traffic: { color: "#5B7FAD", label: "Configured traffic" },
  direct: { color: "#9FC6EA", dash: "2 5", label: "Direct / native path" },
  governs: { color: "#B48CFF", dash: "5 4", label: "Policy / configuration" },
  protects: { color: "#2EC4B6", label: "Protection / governance" },
  observes: { color: "#9FC6EA", dash: "2 5", label: "Discovery / monitoring" },
};
export const REFERENCE_DETAILS = Object.fromEntries([
  ...REF.layers.flatMap((layer) => layer.surfaces),
  ...REF.pillars.flatMap((pillar) => pillar.products),
].map((entry) => [entry.id, entry]));

const node = (id: string, title: string, sub: string, x: number, y: number, w: number, h: number,
  role: FlowNode["role"], refs: string[], note?: string): FlowNode => ({ id, title, sub, x, y, w, h, role, refs, note });
const edge = (id: string, from: string, to: string, kind: ConnectionKind, points: FlowPoint[], label?: string, at?: FlowPoint): FlowConnection =>
  ({ id, from, to, kind, points, label, at });
const route = (id: string, nodes: string[], edges: string[]): RuntimeRoute => ({ id, nodes, edges });
const bottom = (id: string, title: string, sub: string, index: number, refs: string[], note?: string) =>
  node(id, title, sub, 24 + index * 294, 584, 270, 76, "control", refs, note);

const studio: AgentFlow = {
  workloads: ["studio"], referenceSubjects: ["studio", "employees", "builders"],
  id: "studio", label: "Copilot Studio", title: "Copilot Studio agents",
  summary: "Separate the agent’s supported tool egress from its Microsoft-managed model and knowledge paths.",
  scope: "Secure Web & AI GW needs environment/group enablement and tenant-level baseline policies; Conditional Access-linked profiles are not supported for this integration. Only supported HTTP, connector and MCP paths are covered. Managed LLM, Bing/public-web/Wikipedia, Dataverse/Azure SQL knowledge and prompt/agent-flow/Computer Use/child-agent custom tools are excluded. Existing custom connectors need editing and saving after enablement. Third-party DLP partners are not supported.",
  defaultNode: "agent",
  sourceLabels: ["Copilot Studio GSA scope", "Agent registry visibility", "Runtime protection coverage", "Studio identity and channel scope", "Studio Purview support", "Power Platform connector policy scope"],
  nodes: [
    node("access", "Identity & device policies", "Configured access checks", 24, 48, 270, 76, "control", ["entra", "idp", "intune"]),
    node("policy", "Power Platform policies", "Connector use · admin control", 320, 48, 270, 76, "control", ["ppac"]),
    node("maker", "Maker configuration", "Tools · authentication choices", 620, 48, 270, 76, "control", ["builders", "ppac"], "This is agent configuration, not a network hop in the user’s runtime request."),
    node("operations", "Posture & SecOps", "DSPM · Defender XDR · Sentinel", 930, 48, 246, 76, "control", ["dspm", "xdr", "sentinel"], "Supported posture insights, hunting behaviors, incidents and ingested logs are separate evidence sources. Configuration and telemetry coverage vary."),
    node("user", "Users", "Teams · Copilot · web channels", 24, 280, 204, 72, "actor", ["employees"]),
    node("agent", "Copilot Studio agent", "Orchestration + configured tools", 306, 270, 260, 92, "service", ["studio"]),
    node("gateway", "Secure Web & AI GW", "Supported connector / HTTP egress", 620, 224, 220, 110, "gateway", ["gsaagents"]),
    node("mcp", "MCP servers & tools", "Supported MCP connectors", 930, 190, 246, 60, "resource", ["mcp", "gsaagents"]),
    node("http", "Connectors & HTTP", "Supported outbound calls", 930, 270, 246, 60, "resource", ["connectors", "gsaagents"]),
    node("model", "Microsoft-managed models", "Model calls do not use GSA", 930, 350, 246, 60, "resource", ["studio", "gsaagents"]),
    node("knowledge", "Knowledge sources", "Dataverse / Azure SQL example", 930, 430, 246, 60, "resource", ["gsaagents"], "These knowledge calls are excluded from the GSA-for-agents integration. Other knowledge sources need their own coverage check."),
    bottom("identity", "Entra Agent ID", "Agent identity · applicable policies", 0, ["agentid"]),
    bottom("registry", "Agent 365", "Registry · platform-specific governance", 1, ["a365"]),
    bottom("data", "Purview labels & DLP", "Supported sources / channels only", 2, ["purview"], "Knowledge-source and channel coverage apply. These policies do not automatically inspect every tool output."),
    bottom("runtime", "Defender runtime protection", "Tool-call checks · preview", 3, ["rtap"], "Connect the supported Studio integration. Cloud rules default to Audit; a matching supported Block rule is required to prevent an action. Hunting behaviors and alerts have different generation rules."),
  ],
  edges: [
    edge("user-agent", "user", "agent", "traffic", [[228,316],[306,316]]),
    edge("agent-gateway", "agent", "gateway", "traffic", [[566,292],[620,292]]),
    edge("gateway-mcp", "gateway", "mcp", "traffic", [[840,245],[890,245],[890,220],[930,220]]),
    edge("gateway-http", "gateway", "http", "traffic", [[840,300],[930,300]]),
    edge("agent-model", "agent", "model", "direct", [[538,362],[538,380],[930,380]], "Model path", [720,372]),
    edge("agent-knowledge", "agent", "knowledge", "direct", [[494,362],[494,460],[930,460]], "Knowledge path (not through GSA)", [716,452]),
    edge("access-user", "access", "user", "governs", [[126,124],[126,280]]),
    edge("policy-agent", "policy", "agent", "governs", [[455,124],[455,270]]),
    edge("operations-agent", "operations", "agent", "observes", [[1053,124],[1053,148],[580,148],[580,202],[550,202],[550,270]]),
    edge("maker-agent", "maker", "agent", "governs", [[755,124],[755,158],[540,158],[540,270]]),
    edge("identity-agent", "identity", "agent", "protects", [[159,584],[159,540],[340,540],[340,362]]),
    edge("registry-agent", "registry", "agent", "observes", [[453,584],[453,362]]),
    edge("data-agent", "data", "agent", "protects", [[747,584],[747,520],[500,520],[500,362]]),
    edge("runtime-agent", "runtime", "agent", "protects", [[1041,584],[1041,542],[550,542],[550,362]]),
  ],
  routes: [
    route("mcp-route", ["user","agent","gateway","mcp"], ["user-agent","agent-gateway","gateway-mcp"]),
    route("http-route", ["user","agent","gateway","http"], ["user-agent","agent-gateway","gateway-http"]),
    route("model-route", ["user","agent","model"], ["user-agent","agent-model"]),
    route("knowledge-route", ["user","agent","knowledge"], ["user-agent","agent-knowledge"]),
  ],
};

const foundry: AgentFlow = {
  workloads: ["foundry"], referenceSubjects: ["foundry", "employees", "builders", "partners", "m365data"],
  id: "foundry", label: "Foundry", title: "Foundry-backed applications and agents",
  summary: "Show configured model and MCP gateway paths separately from native tools and inbound agent APIs.",
  scope: "Configure model routing per resource/project and verify the actual APIM endpoint. Foundry MCP governance is a separate preview for new portal-created tools after gateway connection; existing tools, managed OAuth, code-first MCP, OpenAPI and native tools are outside that mediation feature. It does not log tool traces. Inbound JSON-RPC A2A requires a separately imported backend/API. User-side GSA and the separate AI Gateway preview resource have their own configuration and limits.",
  defaultNode: "agent",
  sourceLabels: ["GSA traffic acquisition", "Foundry MCP gateway limitations", "API Management vs AI Gateway", "AI Gateway migration limitations", "Runtime protection coverage", "Foundry gateway configuration", "APIM A2A backend prerequisites", "Defender for AI Services scope", "Foundry Purview integration"],
  nodes: [
    node("access", "Entra user access", "Sign-in policies · where configured", 24, 48, 270, 76, "control", ["entra", "idp", "intune"]),
    node("network", "Configured app access", "GSA / app network design", 320, 48, 270, 76, "control", ["gsa"], "User access to the custom app and the agent’s downstream API calls are different paths. Public/private access and inspection must be configured separately."),
    node("permissions", "Agent identity & permissions", "Identity does not grant access alone", 620, 48, 270, 76, "control", ["agentid", "builders"]),
    node("operations", "AI posture & SecOps", "CSPM · DSPM · XDR · Sentinel", 930, 48, 246, 76, "control", ["aispm", "dspm", "xdr", "sentinel"], "Defender CSPM posture and Agent 365 inventory are not runtime blocking. Supported events reach Defender or Sentinel through their configured integrations."),
    node("user", "User / calling application", "Custom AI app endpoint", 24, 246, 204, 72, "actor", ["employees"]),
    node("external", "External agent", "Configured JSON-RPC A2A backend", 24, 430, 204, 70, "actor", ["partners"], "This example requires an existing compatible A2A backend/adapter and agent card explicitly imported into APIM, with backend authentication and applicable API policies. It does not automatically expose every Foundry agent."),
    node("agent", "Foundry agent", "Orchestration + tool selection", 306, 230, 260, 104, "service", ["foundry"]),
    node("gateway", "APIM AI gateway", "Configured model / MCP routes", 620, 220, 220, 115, "gateway", ["aigw"]),
    node("model", "AI models", "Model policies on routed calls", 930, 190, 246, 64, "resource", ["models", "aigw"]),
    node("mcp", "Eligible MCP tools", "Foundry governance · preview", 930, 286, 246, 64, "resource", ["mcp", "aigw", "foundry"], "New portal-created MCP tools after gateway connection only; managed OAuth, existing and code-first tools are excluded from this mediation feature. Confirm that the tool endpoint points to APIM; gateway metrics are not tool traces."),
    node("native", "Native / other tools", "OpenAPI · code · SharePoint knowledge", 306, 402, 260, 72, "resource", ["foundry", "connectors", "m365data"], "These tools are not included in Foundry’s MCP gateway governance. They retain their own runtime, identity, permission and policy boundaries; this line does not imply that a gateway policy protects them."),
    bottom("registry", "Agent 365", "Onboarded inventory & governance", 0, ["a365"]),
    bottom("data", "Purview data security", "Configured integration & data scope", 1, ["purview"]),
    bottom("model-security", "Defender for AI Services", "Supported model-call detection", 2, ["mdai"]),
    bottom("runtime", "Defender runtime protection", "Platform integration · preview", 3, ["rtap"], "Foundry protection requires its documented integration. Audit records behavior without preventing it; supported Block rules are separate. Not every runtime action creates an incident."),
  ],
  edges: [
    edge("user-agent", "user", "agent", "traffic", [[228,282],[306,282]]),
    edge("agent-gateway", "agent", "gateway", "traffic", [[566,266],[620,266]]),
    edge("gateway-model", "gateway", "model", "traffic", [[840,244],[884,244],[884,222],[930,222]]),
    edge("gateway-mcp", "gateway", "mcp", "traffic", [[840,304],[884,304],[884,318],[930,318]]),
    edge("agent-native", "agent", "native", "direct", [[436,334],[436,402]], "Native tools", [486,390]),
    edge("external-gateway", "external", "gateway", "traffic", [[228,480],[600,480],[600,320],[620,320]], "Inbound A2A API", [410,501]),
    edge("gateway-agent", "gateway", "agent", "traffic", [[620,316],[566,316]]),
    edge("access-user", "access", "user", "governs", [[126,124],[126,246]]),
    edge("network-user", "network", "user", "protects", [[455,124],[455,148],[204,148],[204,246]]),
    edge("permissions-agent", "permissions", "agent", "governs", [[755,124],[755,154],[460,154],[460,230]]),
    edge("operations-agent", "operations", "agent", "observes", [[1053,124],[1053,146],[580,146],[580,210],[550,210],[550,230]]),
    edge("registry-agent", "registry", "agent", "observes", [[159,584],[159,520],[288,520],[288,350],[330,350],[330,334]]),
    edge("data-agent", "data", "agent", "protects", [[453,584],[453,540],[580,540],[580,350],[548,350],[548,334]]),
    edge("model-detection", "model-security", "model", "observes", [[747,584],[747,540],[1188,540],[1188,222],[1176,222]]),
    edge("runtime-agent", "runtime", "agent", "protects", [[1041,584],[1041,520],[580,520],[580,346],[554,346],[554,334]]),
  ],
  routes: [
    route("model-route", ["user","agent","gateway","model"], ["user-agent","agent-gateway","gateway-model"]),
    route("mcp-route", ["user","agent","gateway","mcp"], ["user-agent","agent-gateway","gateway-mcp"]),
    route("native-route", ["user","agent","native"], ["user-agent","agent-native"]),
    route("a2a-route", ["external","gateway","agent"], ["external-gateway","gateway-agent"]),
  ],
};

const copilot: AgentFlow = {
  workloads: ["copilot"], referenceSubjects: ["copilot", "employees", "m365data"],
  id: "copilot", label: "Microsoft Copilot", title: "Microsoft Copilot and Copilot Chat",
  summary: "Parallel user entry points, a shared service, and grounding paths that depend on license, app context and agent configuration.",
  scope: "Licensed Copilot and Copilot Chat have different grounding entitlements. Copilot Chat is not simply limited to pasted text: supplied content, supported app contexts and enabled agents affect what it can use. Web grounding is optional and policy controlled.",
  defaultNode: "service",
  sourceLabels: ["Copilot and Copilot Chat", "Copilot Chat data protection", "Copilot DLP scope", "Agent registry visibility", "DSPM capability ownership", "Copilot agent entitlements", "Restricted Content Discovery limits", "SAM features included with Copilot"],
  nodes: [
    node("identity", "Entra access & devices", "Configured sign-in / device policies", 24, 48, 270, 76, "control", ["entra", "idp", "intune"]),
    node("grounding-policy", "Permissions & data policy", "Labels · DLP · grounding scope", 320, 48, 270, 76, "control", ["purview", "sam"]),
    node("registry-policy", "Agent availability", "Approval · entitlement · metering", 620, 48, 270, 76, "control", ["a365"]),
    node("device-network", "Device & network controls", "GSA · Defender for Endpoint", 930, 48, 246, 76, "control", ["gsa", "mde"], "GSA only acquires enabled, assigned user-device traffic. Endpoint protection and device compliance do not insert a proxy into Copilot’s service-side grounding calls."),
    node("licensed", "Licensed Copilot users", "Broad work-grounding capabilities", 24, 208, 204, 76, "actor", ["employees", "copilot"]),
    node("chat", "Copilot Chat users", "Grounding varies by context", 24, 342, 204, 76, "actor", ["employees", "copilot"]),
    node("service", "Microsoft Copilot service", "Grounding + orchestration", 306, 250, 260, 112, "service", ["copilot"]),
    node("agents", "Work-data agents", "Configured & authorized", 650, 430, 210, 70, "service", ["a365"], "This branch illustrates an approved work-data agent with configured authorization. Public/instruction-only agents do not need a tenant-data path. Usage entitlement and metering vary; registry approval is not universal source-platform runtime enforcement."),
    node("work", "Microsoft 365 work data", "Permissions + licensed capabilities", 930, 190, 246, 64, "resource", ["m365data", "copilot"]),
    node("context", "Supplied / app context", "Files · pages · supported contexts", 930, 286, 246, 64, "resource", ["copilot"], "Copilot Chat can use user-supplied content and supported app contexts. Exact grounding scope and protection depend on the app and feature; file upload and policy exclusions must be checked."),
    node("web", "Web grounding", "Bing · admin web-search policy", 930, 382, 246, 64, "resource", ["copilot"], "When enabled, web grounding uses generated search queries. Those queries have separate data-handling terms from Microsoft 365 prompts and responses; review the current web-search documentation."),
    bottom("data", "Purview labels & DLP", "Configured policy / supported content", 0, ["purview"]),
    bottom("posture", "Purview DSPM", "Risk insights & remediation", 1, ["dspm"]),
    bottom("sharing", "SharePoint controls", "Permissions & oversharing cleanup", 2, ["sam"]),
    bottom("detection", "Defender XDR & Sentinel", "Supported incidents / ingested logs", 3, ["xdr", "sentinel"]),
  ],
  edges: [
    edge("licensed-service", "licensed", "service", "traffic", [[228,246],[270,246],[270,280],[306,280]]),
    edge("chat-service", "chat", "service", "traffic", [[228,380],[270,380],[270,332],[306,332]]),
    edge("service-work", "service", "work", "traffic", [[566,280],[610,280],[610,222],[930,222]], "Licensed work grounding", [765,212]),
    edge("service-context", "service", "context", "traffic", [[566,318],[930,318]], "Supplied / supported app context", [744,308]),
    edge("service-web", "service", "web", "direct", [[566,342],[600,342],[600,414],[930,414]], "Optional web grounding", [754,405]),
    edge("service-agents", "service", "agents", "traffic", [[540,362],[540,465],[650,465]]),
    edge("agents-work", "agents", "work", "traffic", [[860,465],[902,465],[902,240],[930,240]], "Authorized work-data access", [1030,265]),
    edge("identity-licensed", "identity", "licensed", "governs", [[126,124],[126,208]]),
    edge("identity-chat", "identity", "chat", "governs", [[44,124],[12,124],[12,380],[24,380]]),
    edge("policy-service", "grounding-policy", "service", "governs", [[455,124],[455,250]]),
    edge("registry-agents", "registry-policy", "agents", "governs", [[755,124],[900,124],[900,480],[860,480]]),
    edge("network-licensed", "device-network", "licensed", "protects", [[1053,124],[1053,148],[240,148],[240,188],[126,188],[126,208]]),
    edge("network-chat", "device-network", "chat", "protects", [[1053,124],[1053,152],[12,152],[12,380],[24,380]]),
    edge("data-service", "data", "service", "protects", [[159,584],[159,530],[340,530],[340,362]]),
    edge("posture-service", "posture", "service", "observes", [[453,584],[453,362]]),
    edge("sharing-work", "sharing", "work", "protects", [[747,584],[747,542],[1188,542],[1188,222],[1176,222]]),
    edge("detection-service", "detection", "service", "observes", [[1041,584],[1041,520],[510,520],[510,362]]),
  ],
  routes: [
    route("licensed-work", ["licensed","service","work"], ["licensed-service","service-work"]),
    route("licensed-context", ["licensed","service","context"], ["licensed-service","service-context"]),
    route("chat-context", ["chat","service","context"], ["chat-service","service-context"]),
    route("licensed-web", ["licensed","service","web"], ["licensed-service","service-web"]),
    route("chat-web", ["chat","service","web"], ["chat-service","service-web"]),
    route("licensed-agent", ["licensed","service","agents","work"], ["licensed-service","service-agents","agents-work"]),
    route("chat-agent", ["chat","service","agents","work"], ["chat-service","service-agents","agents-work"]),
  ],
};

const thirdparty: AgentFlow = {
  id: "thirdparty", label: "Third-party AI", title: "Approved third-party AI",
  workloads: ["thirdparty"], referenceSubjects: ["thirdparty", "employees", "m365data"],
  headings: ["CALLER", "ACQUIRED DEVICE TRAFFIC", "VENDOR AI SERVICE", "PROVIDER DATA & TOOLS"],
  summary: "Separate employee-device controls from provider-hosted models, connectors and tool traffic.",
  scope: "An example approved enterprise AI service, not a provider-neutral guarantee. Device GSA does not automatically acquire a vendor’s hosted Microsoft 365 connector or backend traffic. Provider authentication, consent, permissions and data handling need separate validation.",
  defaultNode: "service",
  sourceLabels: ["GSA traffic acquisition", "Connected-platform inventory scope", "DSPM capability ownership", "XDR and Sentinel integration limits", "Custom-agent Purview enforcement"],
  nodes: [
    node("access", "Identity & device policies", "Entra · risk · Intune compliance", 24, 48, 270, 76, "control", ["entra", "idp", "intune"], "Conditional Access applies to supported Microsoft-authenticated flows, not every native vendor account or web session."),
    node("consent", "Tenant data authorization", "Consent · least-privilege scopes", 320, 48, 270, 76, "control", ["entra", "m365data"], "Review each hosted connector’s consent, token subject, permissions and data scope. Device controls do not replace authorization."),
    node("inventory", "Supported agent inventory", "Agent 365 · connected platforms", 620, 48, 270, 76, "control", ["a365"], "Connected-platform inventory is not universal control over a vendor’s web sessions or runtime."),
    node("operations", "Security operations", "Defender XDR · Sentinel", 930, 48, 246, 76, "control", ["xdr", "sentinel"]),
    node("user", "Employee / managed device", "Browser or desktop AI client", 24, 280, 204, 76, "actor", ["employees"]),
    node("network", "Device GSA", "Enabled forwarding profiles only", 306, 270, 260, 92, "gateway", ["gsa"]),
    node("service", "Approved vendor AI", "Enterprise account / app", 620, 270, 220, 92, "service", ["thirdparty"]),
    node("model", "Provider-hosted models", "Provider service boundary", 930, 190, 246, 64, "resource", ["models", "thirdparty"], "Defender for AI Services does not automatically protect arbitrary third-party model backends."),
    node("work", "Hosted M365 connector", "Separate OAuth / data path", 930, 286, 246, 64, "resource", ["m365data", "connectors"], "A provider-hosted connector uses a service-side data path, not the employee’s device GSA route. Permissions and supported Purview integrations must be evaluated independently."),
    node("tools", "Vendor tools / APIs", "Provider-specific tool egress", 930, 414, 246, 72, "resource", ["mcp", "connectors"], "Tool support and enforcement are provider-specific. Local clients and local MCP are covered in the Local agents flow."),
    bottom("data", "Endpoint / browser DLP", "Supported device data activities", 0, ["purview"], "Purview connectors for third-party AI provide their documented visibility and compliance functions; they do not imply inline DLP on every vendor request."),
    bottom("posture", "Purview DSPM", "Supported AI data-risk visibility", 1, ["dspm"]),
    bottom("endpoint", "Defender for Endpoint", "Device protection & configured blocks", 2, ["mde"]),
    bottom("catalog", "Defender for Cloud Apps", "App catalog · sanction decisions", 3, ["mdca"], "An Unsanctioned tag needs a configured enforcement integration; tagging alone is not a block."),
  ],
  edges: [
    edge("user-network", "user", "network", "traffic", [[228,318],[306,318]]),
    edge("network-service", "network", "service", "traffic", [[566,318],[620,318]]),
    edge("service-model", "service", "model", "direct", [[840,288],[882,288],[882,222],[930,222]]),
    edge("service-work", "service", "work", "direct", [[840,318],[930,318]], "Hosted connector path", [1036,274]),
    edge("service-tools", "service", "tools", "direct", [[820,362],[820,450],[930,450]], "Hosted tool path", [1010,402]),
    edge("access-user", "access", "user", "governs", [[126,124],[126,280]]),
    edge("consent-work", "consent", "work", "governs", [[455,124],[455,148],[1188,148],[1188,318],[1176,318]]),
    edge("inventory-service", "inventory", "service", "observes", [[755,124],[755,270]]),
    edge("operations-service", "operations", "service", "observes", [[1053,124],[1053,148],[876,148],[876,270],[840,270]]),
    edge("data-user", "data", "user", "protects", [[159,584],[159,356]]),
    edge("posture-service", "posture", "service", "observes", [[453,584],[453,530],[730,530],[730,362]]),
    edge("endpoint-user", "endpoint", "user", "protects", [[747,584],[747,542],[240,542],[240,350],[228,350]]),
    edge("catalog-service", "catalog", "service", "observes", [[1041,584],[1041,520],[810,520],[810,362]]),
  ],
  routes: [
    route("model-route", ["user","network","service","model"], ["user-network","network-service","service-model"]),
    route("work-route", ["user","network","service","work"], ["user-network","network-service","service-work"]),
    route("tools-route", ["user","network","service","tools"], ["user-network","network-service","service-tools"]),
  ],
};

const shadow: AgentFlow = {
  id: "shadow", label: "Shadow AI", title: "Shadow AI websites and desktop clients",
  workloads: ["shadowai"], referenceSubjects: ["shadowai", "local", "employees"],
  headings: ["CALLER", "BROWSER / DESKTOP CLIENT", "ACQUIRED NETWORK TRAFFIC", "REMOTE AI & TOOLS"],
  summary: "Distinguish unsanctioned destinations, sensitive-data actions, desktop-agent discovery and scoped execution blocking.",
  scope: "Configured remote traffic only. Domain discovery does not identify every personal account or extension. Intune’s Shadow AI (Frontier) workflow currently blocks common OpenClaw execution paths on enrolled Windows, not every detected app or execution method. Policy propagation is not instantaneous. Other desktop or web restrictions require their own supported policies.",
  defaultNode: "browser",
  sourceLabels: ["GSA traffic acquisition", "Agent 365 desktop discovery", "XDR and Sentinel integration limits", "DSPM capability ownership", "Shadow AI discovery and enforcement", "Remote MCP firewall scope", "Govern discovered apps using Microsoft Defender for Endpoint"],
  nodes: [
    node("device-policy", "Intune device policies", "Configuration · scoped app control", 24, 48, 270, 76, "control", ["intune"], "The Frontier block action creates an Intune execution-blocking policy for OpenClaw on enrolled Windows. This is not blanket prevention of AI app installation."),
    node("identity", "Conditional Access scope", "Supported Entra sign-ins only", 320, 48, 270, 76, "control", ["entra", "idp"], "Native personal vendor accounts are not governed just because a device is compliant. GSA network policies are a separate control."),
    node("posture", "Purview DSPM", "Supported data-risk insights", 620, 48, 270, 76, "control", ["dspm"]),
    node("operations", "Security operations", "Defender XDR · Sentinel", 930, 48, 246, 76, "control", ["xdr", "sentinel"]),
    node("user", "Employee / managed device", "Unapproved AI use", 24, 260, 204, 76, "actor", ["employees"]),
    node("browser", "Browser / AI client", "Unapproved or personal account", 306, 218, 260, 80, "service", ["shadowai"]),
    node("desktop", "Unapproved desktop agent", "Remote-service use in this view", 306, 402, 260, 76, "service", ["shadowai", "local"], "Local inference and stdio MCP are shown separately in the Local agents flow; they do not traverse a cloud proxy."),
    node("network", "Device GSA", "Acquired traffic · configured policy", 620, 242, 220, 110, "gateway", ["gsa"]),
    node("ai", "AI sites / services", "Sanction policy is not a verdict", 930, 202, 246, 76, "resource", ["shadowai", "models"]),
    node("tools", "Remote MCP / APIs", "Supported acquired traffic", 930, 408, 246, 76, "resource", ["mcp", "connectors"]),
    bottom("endpoint", "Defender for Endpoint", "Unsanctioned-domain enforcement", 0, ["mde"], "Defender for Cloud Apps integration and network protection in block mode are required for its Unsanctioned app-domain enforcement. This is not the same as blocking every executable."),
    bottom("data", "Endpoint / browser DLP", "Supported sensitive-data actions", 1, ["purview"]),
    bottom("catalog", "Defender for Cloud Apps", "AI catalog · discovery / tags", 2, ["mdca"]),
    bottom("inventory", "Agent 365 desktop inventory", "Frontier discovery · limited blocking", 3, ["a365"]),
  ],
  edges: [
    edge("user-browser", "user", "browser", "traffic", [[228,284],[266,284],[266,258],[306,258]]),
    edge("user-desktop", "user", "desktop", "traffic", [[126,336],[126,440],[306,440]]),
    edge("browser-network", "browser", "network", "traffic", [[566,258],[592,258],[592,276],[620,276]]),
    edge("desktop-network", "desktop", "network", "traffic", [[566,440],[594,440],[594,328],[620,328]]),
    edge("network-ai", "network", "ai", "traffic", [[840,276],[884,276],[884,240],[930,240]]),
    edge("network-tools", "network", "tools", "traffic", [[840,328],[884,328],[884,446],[930,446]]),
    edge("device-desktop", "device-policy", "desktop", "protects", [[159,124],[159,146],[288,146],[288,440],[306,440]]),
    edge("identity-browser", "identity", "browser", "governs", [[455,124],[455,218]]),
    edge("posture-browser", "posture", "browser", "observes", [[755,124],[755,148],[580,148],[580,202],[550,202],[550,218]]),
    edge("operations-desktop", "operations", "desktop", "observes", [[1053,124],[1053,148],[1188,148],[1188,520],[540,520],[540,478]]),
    edge("endpoint-user", "endpoint", "user", "protects", [[159,584],[159,530],[44,530],[44,336]]),
    edge("data-browser", "data", "browser", "protects", [[453,584],[453,540],[280,540],[280,318],[340,318],[340,298]]),
    edge("catalog-ai", "catalog", "ai", "observes", [[747,584],[747,540],[1188,540],[1188,240],[1176,240]]),
    edge("inventory-desktop", "inventory", "desktop", "observes", [[1041,584],[1041,528],[526,528],[526,478]]),
  ],
  routes: [
    route("web-route", ["user","browser","network","ai"], ["user-browser","browser-network","network-ai"]),
    route("desktop-ai-route", ["user","desktop","network","ai"], ["user-desktop","desktop-network","network-ai"]),
    route("desktop-tools-route", ["user","desktop","network","tools"], ["user-desktop","desktop-network","network-tools"]),
  ],
};

const local: AgentFlow = {
  id: "local", label: "Local agents", title: "Local agents, coding tools and MCP",
  workloads: ["local"], referenceSubjects: ["local", "employees", "builders"],
  headings: ["CALLER", "LOCAL AGENT / TOOLS", "REMOTE ACCESS / LOCAL INFERENCE", "REMOTE MODELS & TOOLS"],
  summary: "Keep remote calls, local stdio tools and on-device inference on distinct paths.",
  scope: "Device GSA controls acquired remote traffic only; local stdio MCP and on-device inference have no network hop through it. MCP firewall requires supported HTTP/SSE traffic, forwarding and TLS inspection; local/non-HTTP transports and JSON-RPC batches are excluded. Endpoint runtime protection is a separately enabled Windows preview with method-specific support. Audit does not block; agent-native and network inspection are configured separately. Certificate pinning and HTTP/3 exclude network inspection.",
  defaultNode: "agent",
  sourceLabels: ["GSA traffic acquisition", "Runtime protection coverage", "Agent 365 desktop discovery", "XDR and Sentinel integration limits", "Endpoint runtime support matrix", "Remote MCP firewall scope", "Set up AI agent runtime protection with Microsoft Defender for Endpoint (Preview)"],
  nodes: [
    node("device-policy", "Device configuration", "Intune · supported device controls", 24, 48, 270, 76, "control", ["intune"], "Device configuration is separate from local tool authorization. Frontier execution blocking remains limited to currently supported agents."),
    node("identity", "Identity & permissions", "User / agent / app / API key", 320, 48, 270, 76, "control", ["entra", "idp", "agentid"], "A local agent does not automatically have an Entra Agent ID. Evaluate the actual caller and token subject; native API-key paths do not inherit Entra Conditional Access."),
    node("authorization", "Tool authorization", "Permissions · approval boundaries", 620, 48, 270, 76, "control", ["connectors", "builders"], "Apply least-privilege permissions and approval to high-impact actions. A network allow decision is not authorization to execute every local command."),
    node("operations", "Security operations", "Defender XDR · Sentinel", 930, 48, 246, 76, "control", ["xdr", "sentinel"]),
    node("user", "User / developer", "Managed endpoint", 24, 270, 204, 76, "actor", ["employees", "builders"]),
    node("agent", "Local / coding agent", "CLI · desktop · custom client", 306, 254, 260, 100, "service", ["local"]),
    node("network", "Device GSA", "Acquired remote traffic only", 620, 224, 220, 110, "gateway", ["gsa"]),
    node("model", "Remote AI models", "Configured provider endpoint", 930, 190, 246, 64, "resource", ["models"]),
    node("remote-mcp", "Remote MCP / APIs", "Supported remote inspection", 930, 286, 246, 64, "resource", ["mcp", "connectors"]),
    node("stdio", "Local tools / stdio MCP", "Local process boundary", 306, 420, 260, 76, "resource", ["mcp", "connectors"], "Local stdio does not traverse GSA. Separate endpoint runtime protections may apply to documented supported combinations; do not infer universal local MCP coverage."),
    node("inference", "On-device inference", "No cloud network hop", 620, 420, 220, 76, "resource", ["models"], "No remote GSA path exists for offline model execution. Device and local application controls retain their own scope."),
    bottom("endpoint", "Defender for Endpoint", "Device / agent discovery & risk", 0, ["mde"]),
    bottom("runtime", "Endpoint runtime protection", "Windows preview · Audit / Block", 1, ["rtap"], "Protection is separately enabled. Only supported inspection paths and a matching blocking rule in Block mode can prevent an action."),
    bottom("data", "Purview Endpoint DLP", "Supported classified-data actions", 2, ["purview"], "Endpoint DLP covers supported data activities, not arbitrary agent reasoning or every tool response."),
    bottom("inventory", "Agent 365 desktop inventory", "Supported discovery · Frontier", 3, ["a365"]),
  ],
  edges: [
    edge("user-agent", "user", "agent", "traffic", [[228,308],[306,308]]),
    edge("agent-network", "agent", "network", "traffic", [[566,282],[620,282]]),
    edge("network-model", "network", "model", "traffic", [[840,246],[884,246],[884,222],[930,222]]),
    edge("network-mcp", "network", "remote-mcp", "traffic", [[840,310],[930,310]]),
    edge("agent-stdio", "agent", "stdio", "direct", [[436,354],[436,420]], "Local tool path", [505,390]),
    edge("agent-inference", "agent", "inference", "direct", [[542,354],[542,390],[730,390],[730,420]], "On-device model", [724,380]),
    edge("device-user", "device-policy", "user", "governs", [[126,124],[126,270]]),
    edge("identity-agent", "identity", "agent", "governs", [[455,124],[455,254]]),
    edge("authorization-stdio", "authorization", "stdio", "governs", [[755,124],[755,148],[580,148],[580,402],[550,402],[550,420]]),
    edge("operations-agent", "operations", "agent", "observes", [[1053,124],[1053,150],[590,150],[590,210],[550,210],[550,254]]),
    edge("endpoint-agent", "endpoint", "agent", "protects", [[159,584],[159,530],[288,530],[288,372],[330,372],[330,354]]),
    edge("runtime-agent", "runtime", "agent", "protects", [[453,584],[453,540],[288,540],[288,372],[340,372],[340,354]]),
    edge("data-stdio", "data", "stdio", "protects", [[747,584],[747,542],[520,542],[520,496]]),
    edge("inventory-agent", "inventory", "agent", "observes", [[1041,584],[1041,528],[578,528],[578,372],[550,372],[550,354]]),
  ],
  routes: [
    route("remote-model-route", ["user","agent","network","model"], ["user-agent","agent-network","network-model"]),
    route("remote-mcp-route", ["user","agent","network","remote-mcp"], ["user-agent","agent-network","network-mcp"]),
    route("local-tools-route", ["user","agent","stdio"], ["user-agent","agent-stdio"]),
    route("local-inference-route", ["user","agent","inference"], ["user-agent","agent-inference"]),
  ],
};

export const AGENT_FLOWS: AgentFlow[] = [copilot, studio, foundry, thirdparty, shadow, local];
export const FLOW_SOURCES = [
  ...REF.sources,
  { label: "Copilot and Copilot Chat", href: "https://learn.microsoft.com/en-us/copilot/overview" },
  { label: "Copilot Chat data protection", href: "https://learn.microsoft.com/en-us/copilot/plan/privacy-and-protections" },
  { label: "Copilot DLP scope", href: "https://learn.microsoft.com/en-us/purview/dlp-microsoft365-copilot-location-learn-about" },
  { label: "Shadow AI discovery and enforcement", href: "https://learn.microsoft.com/en-us/defender-cloud-apps/governance-discovery" },
  { label: "Remote MCP firewall scope", href: "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-mcp-firewall" },
  { label: "Endpoint runtime support matrix", href: "https://learn.microsoft.com/en-us/defender-endpoint/ai-agent-support-matrix" },
  { label: "Govern discovered apps using Microsoft Defender for Endpoint", href: "https://learn.microsoft.com/en-us/defender-cloud-apps/mde-govern" },
  { label: "Set up AI agent runtime protection with Microsoft Defender for Endpoint (Preview)", href: "https://learn.microsoft.com/en-us/defender-endpoint/configure-ai-agent-runtime-protection" },
];

/** Paths follow explicit runtime routes, never governance or telemetry edges. */
export function focusFlow(view: AgentFlow, selected: string | null) {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!selected) return { nodes, edges };
  nodes.add(selected);
  const item = view.nodes.find((n) => n.id === selected);
  if (item?.role !== "control") {
    for (const r of view.routes.filter((r) => r.nodes.includes(selected))) {
      r.nodes.forEach((id) => nodes.add(id)); r.edges.forEach((id) => edges.add(id));
    }
  } else {
    for (const e of view.edges.filter((e) => e.from === selected || e.to === selected)) {
      nodes.add(e.from); nodes.add(e.to); edges.add(e.id);
    }
  }
  return { nodes, edges };
}
