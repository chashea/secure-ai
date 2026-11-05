// Content for the Securing AI Agents app: architecture views, scenarios and section tables.
export type Verdict = "allow" | "block" | "detect" | "info";
export type Pt = [number, number];
export interface DiagramNode { id: string; x: number; y: number; w: number; h: number; title: string; title2: string; sub: string[]; desc: string; kind: string }
export interface Wire { pts: Pt[]; arrow: boolean }
export interface Connector { pts: string; label: string; lx: number; ly: number }
export interface Column { x: number; w: number; label: string; sub: string }
export interface DiagramView {
  id: string; label: string; title: string; take: string; defaultNode: string;
  columns: Column[]; nodes: DiagramNode[]; wires: Wire[]; connectors: Connector[];
  paths: Record<string, Pt[]>; scenarios: string[];
}
export interface ScenarioStep { path: string; node: string; verdict: Verdict; control: string; text: string }
export interface Scenario { id: string; r: string; name: string; sub: string; steps: ScenarioStep[]; outLead: string; outText: string }
export interface Flow { title: string; sub: string; gw: boolean }
export interface Head { title: string; sub: string }
export interface GridRow { label: string; owner: string; cells: string[][] }
export interface FrameworkCell { items: string[]; gw: boolean; shadow: boolean }
export interface FrameworkRow { layer: string; sub: string; risks: string[]; cells: FrameworkCell[] }
export interface RefSource { label: string; href: string }
export interface RefLink { id: string; how: string; kind?: "protect" | "observe"; sources?: RefSource[] }
export interface RefSurface { id: string; title: string; sub: string; desc: string }
export interface RefLayer { id: string; label: string; surfaces: RefSurface[] }
export interface RefProduct { id: string; title: string; sub: string; desc: string; preview: boolean; protects: RefLink[]; works: RefLink[] }
export interface RefPillar { id: string; label: string; band: boolean; products: RefProduct[] }
export interface RefNode { id: string; ref: string; x: number; y: number; w: number; h: number; title: string; sub: string; kind: string; align: string }
export interface RefWire { pts: Pt[]; style: string; arrow: boolean; label: string; lx: number; ly: number; tags: string[] }
export interface RefFrame { x: number; y: number; w: number; h: number; label: string; lx: number; ly: number; tone: string }
export interface RefLabel { x: number; y: number; t: string; small?: boolean }

/** Every view shares this canvas. Flow reads left to right. */
export const VIEWBOX = "0 14 1200 620";
export const VIEWS: DiagramView[] = [
 {
  "id": "overview",
  "label": "Overview",
  "title": "The whole picture",
  "take": "Four layers, two gateways. The controls have to work together.",
  "defaultNode": "gw1",
  "columns": [
   {
    "x": 24,
    "w": 312,
    "label": "WHO'S ASKING",
    "sub": "People and agents"
   },
   {
    "x": 434,
    "w": 272,
    "label": "CONTROL POINTS",
    "sub": "Where policy is enforced"
   },
   {
    "x": 794,
    "w": 382,
    "label": "WHAT THEY REACH",
    "sub": "AI apps, models, tools & data"
   }
  ],
  "nodes": [
   {
    "id": "user",
    "x": 40,
    "y": 78,
    "w": 280,
    "h": 56,
    "title": "Employee",
    "title2": "",
    "sub": [
     "Managed device · browser"
    ],
    "desc": "A person on a managed device using AI through a browser, desktop app or Copilot.",
    "kind": ""
   },
   {
    "id": "endpoint",
    "x": 40,
    "y": 142,
    "w": 280,
    "h": 44,
    "title": "Endpoint controls",
    "title2": "",
    "sub": [
     "DLP · Defender · Intune"
    ],
    "desc": "Purview Endpoint DLP (with browser protection) blocks pasting or uploading sensitive data to AI sites; devices must be onboarded, and Chrome or Firefox on Windows need the Purview extension. Apps marked Unsanctioned in Defender for Cloud Apps sync to Defender for Endpoint, and network protection in block mode enforces the block. Intune compliance feeds Conditional Access.",
    "kind": "ctl"
   },
   {
    "id": "studio",
    "x": 40,
    "y": 218,
    "w": 280,
    "h": 64,
    "title": "Copilot Studio agents",
    "title2": "",
    "sub": [
     "Tools governed by",
     "Power Platform data policies"
    ],
    "desc": "Agents built in Copilot Studio. They can use MCP servers, connectors, REST APIs and HTTP requests, governed by Power Platform data policies. New agents get a Microsoft Entra Agent ID automatically (since May 2026) and join the Agent 365 registry once Agent 365 is set up. Their outbound tool traffic can be forwarded to Global Secure Access. They don’t route through the AI Gateway by default, though they can call MCP servers and APIs published through API Management.",
    "kind": ""
   },
   {
    "id": "ext",
    "x": 40,
    "y": 330,
    "w": 280,
    "h": 56,
    "title": "External agent",
    "title2": "",
    "sub": [
     "Partner / third-party"
    ],
    "desc": "An agent outside your tenant calling your agents agent-to-agent (A2A). API Management can expose JSON-RPC A2A agent APIs and govern them with policies, credentials and IP filtering.",
    "kind": ""
   },
   {
    "id": "agent",
    "x": 40,
    "y": 420,
    "w": 280,
    "h": 56,
    "title": "Microsoft Foundry",
    "title2": "",
    "sub": [
     "Agents and apps your teams build"
    ],
    "desc": "Agents built in the Foundry Agent Service, using tools such as OpenAPI, Code Interpreter and MCP. Foundry guardrails (Azure AI Content Safety) screen prompts and responses, including user prompt attacks and indirect attacks; agent guardrails are in preview. Foundry provisions an Entra Agent ID automatically, and published agents sync to the Agent 365 registry once Agent 365 is licensed.",
    "kind": ""
   },
   {
    "id": "gw1",
    "x": 450,
    "y": 70,
    "w": 240,
    "h": 216,
    "title": "Global Secure Access",
    "title2": "",
    "sub": [
     "Microsoft Entra Internet Access",
     "Internet + Microsoft 365 traffic",
     "People, devices & Copilot Studio"
    ],
    "desc": "Microsoft’s Security Service Edge. The GSA client tunnels internet traffic (Internet Access profile) and Microsoft 365 traffic (Microsoft traffic profile) to Microsoft’s edge; enable both profiles for full coverage. For people and devices: shadow AI discovery, web content filtering, Universal Conditional Access, Prompt Injection Protection and the MCP firewall (preview) for remote MCP servers. For Copilot Studio agents, Secure Web and AI Gateway applies web content, threat intelligence and network file filtering to supported agent traffic (HTTP nodes, custom connectors, MCP connectors), turned on per environment in Power Platform. Most AI controls need TLS inspection.",
    "kind": "gw"
   },
   {
    "id": "gw2",
    "x": 450,
    "y": 312,
    "w": 240,
    "h": 172,
    "title": "AI Gateway",
    "title2": "",
    "sub": [
     "Azure API Management",
     "Foundry & custom agents · A2A"
    ],
    "desc": "AI gateway in Microsoft Foundry (preview), built on Azure API Management (v2 tiers). One governed entry point between Foundry and custom agents and the models and tools they call: managed-identity authentication, token limits, content safety, semantic caching, load balancing and prompt and completion logging. MCP tools created in the Foundry portal can be governed through it (preview). With the Agent 365 Tools Gateway (preview) it inventories MCP servers and can block a server; blocking a single tool needs the new AI Gateway (preview). Agents use it only when configured to, so lock backends so the gateway is the only caller. Copilot Studio agents don’t use it by default.",
    "kind": "gw"
   },
   {
    "id": "shadow",
    "x": 810,
    "y": 74,
    "w": 350,
    "h": 50,
    "title": "Shadow AI app",
    "title2": "",
    "sub": [
     "Unsanctioned or personal"
    ],
    "desc": "AI that IT never approved, such as a public chatbot, a browser AI extension, or a personal account on an otherwise approved tool (for example a personal Claude or ChatGPT login). It is a major way sensitive data leaks into AI.",
    "kind": "shadow"
   },
   {
    "id": "third",
    "x": 810,
    "y": 138,
    "w": 350,
    "h": 50,
    "title": "Third-party AI",
    "title2": "",
    "sub": [
     "Claude · ChatGPT · others"
    ],
    "desc": "Approved AI from other vendors, such as Claude Enterprise or ChatGPT Enterprise. People reach it through Global Secure Access, and it is tagged sanctioned in Defender for Cloud Apps. Purview connectors (preview, pay-as-you-go) bring in audit and DSPM visibility after the fact; neither supports Purview DLP or sensitivity labels, so inline protection comes from GSA and Endpoint DLP. Its Microsoft 365 connector reads tenant data with delegated Graph permissions, so govern it in Entra: admin consent, required user assignment and Conditional Access. Personal accounts of the same tools are shadow AI.",
    "kind": "tp"
   },
   {
    "id": "mcp",
    "x": 810,
    "y": 212,
    "w": 350,
    "h": 50,
    "title": "MCP servers & tools",
    "title2": "",
    "sub": [
     "Microsoft and custom servers"
    ],
    "desc": "MCP servers and tools agents call, from Microsoft (Work IQ, Microsoft 365) or your own. Copilot Studio agents reach them through Power Platform connectors, governed by data policies and optionally routed through GSA. Foundry agents configured to use the AI Gateway reach them there, where Agent 365 (preview) can inventory and block servers.",
    "kind": ""
   },
   {
    "id": "model",
    "x": 810,
    "y": 300,
    "w": 350,
    "h": 50,
    "title": "AI models",
    "title2": "",
    "sub": [
     "Foundry · Anthropic · others"
    ],
    "desc": "Language models from Microsoft Foundry or other providers, including Anthropic Claude, reached through one gateway endpoint. API Management supports the Anthropic Messages API on its v2 tiers.",
    "kind": ""
   },
   {
    "id": "apis",
    "x": 810,
    "y": 370,
    "w": 350,
    "h": 50,
    "title": "APIs & built-in tools",
    "title2": "",
    "sub": [
     "OpenAPI · Code Interpreter"
    ],
    "desc": "Business APIs, data sources and built-in tools such as Code Interpreter and OpenAPI tools. API Management governs the calls; Defender for APIs monitors them.",
    "kind": ""
   },
   {
    "id": "data",
    "x": 20,
    "y": 530,
    "w": 1160,
    "h": 90,
    "title": "✓ Protected end to end",
    "title2": "",
    "sub": [
     "Agent 365 registry & observability",
     "Entra Agent ID",
     "Defender XDR",
     "Purview labels, DLP & DSPM"
    ],
    "desc": "The foundation under everything above: governed, monitored and protected. Agent 365 keeps agents in one registry with owners, agent IDs where supported, and observability. Defender XDR correlates alerts across the stack. Purview DSPM and audit span every layer; sensitivity labels and DLP apply where supported.",
    "kind": "band base"
   }
  ],
  "wires": [
   {
    "pts": [
     [
      180,
      134
     ],
     [
      180,
      142
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      320,
      164
     ],
     [
      448,
      164
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      320,
      250
     ],
     [
      448,
      250
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      320,
      358
     ],
     [
      448,
      358
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      320,
      448
     ],
     [
      448,
      448
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      690,
      99
     ],
     [
      808,
      99
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      690,
      163
     ],
     [
      808,
      163
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      690,
      230
     ],
     [
      808,
      230
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      690,
      395
     ],
     [
      808,
      395
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      780,
      252
     ],
     [
      780,
      395
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      780,
      252
     ],
     [
      808,
      252
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      780,
      325
     ],
     [
      808,
      325
     ]
    ],
    "arrow": true
   }
  ],
  "connectors": [
   {
    "pts": "1160,163 1188,163 1188,575 1180,575",
    "label": "M365 connector",
    "lx": 1180,
    "ly": 330
   }
  ],
  "paths": {},
  "scenarios": []
 },
 {
  "id": "copilot",
  "label": "Microsoft Copilot",
  "title": "Microsoft Copilot: Premium and Copilot Chat",
  "defaultNode": "copilot",
  "take": "Premium sees what each user can already open; Chat sees what people paste and upload. Same protection, different data risk.",
  "columns": [
   {
    "x": 24,
    "w": 250,
    "label": "WHO'S ASKING",
    "sub": "People"
   },
   {
    "x": 294,
    "w": 220,
    "label": "SIGN-IN",
    "sub": "Entra"
   },
   {
    "x": 534,
    "w": 330,
    "label": "MICROSOFT COPILOT",
    "sub": "Service boundary"
   },
   {
    "x": 884,
    "w": 292,
    "label": "WHAT IT REACHES",
    "sub": "Grounding"
   }
  ],
  "connectors": [],
  "paths": {},
  "scenarios": [],
  "nodes": [
   {
    "id": "userp",
    "x": 40,
    "y": 76,
    "w": 218,
    "h": 52,
    "title": "Employees with Copilot",
    "title2": "",
    "sub": [
     "Premium license"
    ],
    "desc": "People with a Microsoft Copilot license (shown as Microsoft 365 Copilot (Premium); also included in Microsoft 365 E7). Copilot is grounded in their work data and the web, and works inside Word, Excel, PowerPoint and OneNote.",
    "kind": ""
   },
   {
    "id": "userc",
    "x": 40,
    "y": 140,
    "w": 218,
    "h": 52,
    "title": "Everyone else",
    "title2": "",
    "sub": [
     "Copilot Chat · no license"
    ],
    "desc": "Anyone signing in with an Entra work account can use Copilot Chat without a Copilot license (shown as Copilot Chat (Basic)). Signing in with Entra turns on enterprise data protection, shown by a green shield.",
    "kind": ""
   },
   {
    "id": "endpoint",
    "x": 40,
    "y": 204,
    "w": 218,
    "h": 48,
    "title": "Endpoint controls",
    "title2": "",
    "sub": [
     "Intune · Defender · DLP"
    ],
    "desc": "Intune decides whether the device is compliant, Defender for Endpoint protects it and can feed device risk into compliance, and Conditional Access can require a compliant device before Copilot opens.",
    "kind": "ctl"
   },
   {
    "id": "surfaces",
    "x": 40,
    "y": 320,
    "w": 218,
    "h": 82,
    "title": "Where they use it",
    "title2": "",
    "sub": [
     "Copilot app · Edge",
     "Teams · Outlook",
     "Office apps: Premium only"
    ],
    "desc": "Both run in the Copilot app (copilot.cloud.microsoft), Teams and Outlook; Copilot Chat is also in the Edge sidebar. Copilot inside Word, Excel, PowerPoint and OneNote needs the Premium license. Admins manage pinning, or remove Copilot Chat access, in Copilot settings in the Microsoft 365 admin center.",
    "kind": ""
   },
   {
    "id": "gw1",
    "x": 310,
    "y": 76,
    "w": 188,
    "h": 374,
    "title": "Entra ID",
    "title2": "",
    "sub": [
     "Conditional Access",
     "MFA · compliant device",
     "Tenant restrictions v2"
    ],
    "desc": "Users sign in with Entra ID. Conditional Access policies that target all resources cover Copilot (check they don’t block the app), with MFA and compliant-device checks. Tenant restrictions v2 can stop sign-in with personal Microsoft accounts.",
    "kind": "gw"
   },
   {
    "id": "copilot",
    "x": 550,
    "y": 76,
    "w": 298,
    "h": 260,
    "title": "Microsoft Copilot",
    "title2": "",
    "sub": [
     "Same orchestrator for both",
     "Responsible AI · jailbreak & XPIA",
     "Enterprise data protection"
    ],
    "desc": "Premium and Copilot Chat use the same orchestrator inside the Microsoft 365 service boundary, under enterprise data protection, and prompts aren’t used to train models. Built-in Responsible AI checks and jailbreak and cross-prompt injection (XPIA) classifiers screen prompts before the model runs. Purview DLP can block prompts with sensitive data (preview).",
    "kind": ""
   },
   {
    "id": "agents",
    "x": 550,
    "y": 370,
    "w": 298,
    "h": 80,
    "title": "Agents",
    "title2": "",
    "sub": [
     "Premium: included",
     "Chat: web free · work data metered"
    ],
    "desc": "With Premium, agents that use web and work data are included. With Copilot Chat, agents grounded in instructions and public websites are free, and agents that use tenant data are pay-as-you-go: off by default and billed to Azure through a Copilot Studio meter. Admins approve or block agents in the Agent Registry in the Microsoft 365 admin center.",
    "kind": ""
   },
   {
    "id": "m365data",
    "x": 900,
    "y": 80,
    "w": 260,
    "h": 64,
    "title": "Microsoft 365 data",
    "title2": "",
    "sub": [
     "Premium: Graph · Work IQ",
     "Chat: metered agents only"
    ],
    "desc": "Premium pulls work data automatically through Microsoft Graph and Work IQ, using only what each user can already open. Copilot Chat isn’t grounded in Microsoft Graph; users reach broader tenant data only through pay-as-you-go agents. Sensitivity labels are honored (encrypted content needs View and Extract rights), and DLP can keep labeled files and emails out.",
    "kind": ""
   },
   {
    "id": "web",
    "x": 900,
    "y": 160,
    "w": 260,
    "h": 52,
    "title": "Web (Bing)",
    "title2": "",
    "sub": [
     "Both · outside the DPA"
    ],
    "desc": "Both send a short search query to Bing with user and tenant identifiers removed; Copilot Chat is web-grounded by default. Those queries aren’t covered by the DPA or the EU Data Boundary, and Microsoft is the data controller for them. Admins control web search with the Allow web search in Copilot policy and can exclude domains, and DLP can block web search when a prompt contains sensitive data.",
    "kind": ""
   },
   {
    "id": "files",
    "x": 900,
    "y": 226,
    "w": 260,
    "h": 60,
    "title": "Files you add",
    "title2": "",
    "sub": [
     "Uploads · / references",
     "Main work source for Chat"
    ],
    "desc": "Users can paste text, upload or reference a file (uploads are stored in their OneDrive), or use the page open in Edge. For Copilot Chat this is the main way work content comes in. Existing permissions apply, but Purview DLP can’t scan files uploaded directly into prompts.",
    "kind": ""
   },
   {
    "id": "mail",
    "x": 900,
    "y": 300,
    "w": 260,
    "h": 52,
    "title": "Mail & calendar",
    "title2": "",
    "sub": [
     "Premium: full · Chat: in Outlook"
    ],
    "desc": "Premium uses mail, calendar and meetings through Work IQ. Copilot Chat in Outlook can use the user’s mail, calendar, meetings and some files through a basic (lexical) index.",
    "kind": ""
   },
   {
    "id": "data",
    "x": 20,
    "y": 530,
    "w": 1160,
    "h": 90,
    "title": "✓ Protected end to end",
    "title2": "",
    "sub": [
     "Purview labels & DLP",
     "Purview DSPM & audit",
     "SharePoint Adv. Management",
     "Defender XDR & Office 365"
    ],
    "desc": "Purview labels and the DLP location Microsoft 365 Copilot and Copilot Chat cover both. Prompts and responses are kept in the user’s mailbox, so Purview Audit, eDiscovery, retention, DSPM, Communication Compliance and Insider Risk cover them. SharePoint Advanced Management, included once the organization has a Copilot license, fixes oversharing. Jailbreak detections show in the Defender portal, and Defender for Office 365 Plan 2 flags prompt injection hidden in email.",
    "kind": "band base"
   }
  ],
  "wires": [
   {
    "pts": [
     [
      149,
      128
     ],
     [
      149,
      140
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      149,
      192
     ],
     [
      149,
      204
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      258,
      228
     ],
     [
      308,
      228
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      258,
      361
     ],
     [
      308,
      361
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      498,
      206
     ],
     [
      548,
      206
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      848,
      112
     ],
     [
      898,
      112
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      848,
      186
     ],
     [
      898,
      186
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      848,
      256
     ],
     [
      898,
      256
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      848,
      326
     ],
     [
      898,
      326
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      699,
      336
     ],
     [
      699,
      368
     ]
    ],
    "arrow": true
   }
  ]
 },
 {
  "id": "studio",
  "label": "Copilot Studio",
  "title": "Copilot Studio agents",
  "take": "Power Platform decides what agents can use; GSA governs where their traffic goes.",
  "defaultNode": "ppenv",
  "columns": [
   {
    "x": 24,
    "w": 220,
    "label": "WHO'S ASKING",
    "sub": "People"
   },
   {
    "x": 264,
    "w": 284,
    "label": "BUILD & POLICY",
    "sub": "Power Platform"
   },
   {
    "x": 564,
    "w": 236,
    "label": "CONTROL POINT",
    "sub": "Network"
   },
   {
    "x": 820,
    "w": 356,
    "label": "WHAT THEY REACH",
    "sub": "Tools & services"
   }
  ],
  "nodes": [
   {
    "id": "admin",
    "x": 40,
    "y": 92,
    "w": 188,
    "h": 60,
    "title": "Admins",
    "title2": "",
    "sub": [
     "Set data policies"
    ],
    "desc": "Power Platform admins set data policies per environment, deciding which connectors and MCP servers agents can use, and turn on Global Secure Access for agents per environment or environment group. A Power Platform Administrator turns it on; a Global Secure Access Administrator sets the policies.",
    "kind": ""
   },
   {
    "id": "maker",
    "x": 40,
    "y": 250,
    "w": 188,
    "h": 56,
    "title": "Makers",
    "title2": "",
    "sub": [
     "Build agents, add tools"
    ],
    "desc": "People who build agents in Copilot Studio and add tools: MCP servers, connectors and HTTP requests. A connector blocked by data policy shows as disabled when they try to add it; for allowed MCP servers they can still turn individual tools off.",
    "kind": ""
   },
   {
    "id": "cuser",
    "x": 40,
    "y": 326,
    "w": 188,
    "h": 56,
    "title": "Users",
    "title2": "",
    "sub": [
     "Teams · Copilot · web"
    ],
    "desc": "People who chat with Copilot Studio agents in Teams, Microsoft 365 Copilot, websites and other channels. The agent then calls its tools and knowledge.",
    "kind": ""
   },
   {
    "id": "ppenv",
    "x": 280,
    "y": 74,
    "w": 252,
    "h": 96,
    "title": "Power Platform",
    "title2": "",
    "sub": [
     "Data policies per environment",
     "Connector & MCP allow / block"
    ],
    "desc": "Data policies decide which connectors agents can use, including MCP connectors: blocking a connector also blocks the tools in connected MCP servers. They’re enforced when makers add tools and again at runtime, and can also restrict HTTP endpoints and publishing channels. Global Secure Access for agents is turned on here per environment (which needs Dataverse).",
    "kind": "ctl"
   },
   {
    "id": "studio",
    "x": 280,
    "y": 250,
    "w": 252,
    "h": 130,
    "title": "Copilot Studio agents",
    "title2": "",
    "sub": [
     "Tools: MCP, connectors, HTTP",
     "Entra Agent ID · Agent 365"
    ],
    "desc": "Agents built in Copilot Studio. They can use MCP servers, connectors, REST APIs and HTTP requests, governed by Power Platform data policies. New agents get a Microsoft Entra Agent ID automatically (since May 2026) and join the Agent 365 registry once Agent 365 is set up. Their outbound tool traffic can be forwarded to Global Secure Access. They don’t route through the AI Gateway by default, though they can call MCP servers and APIs published through API Management.",
    "kind": ""
   },
   {
    "id": "gw1",
    "x": 580,
    "y": 84,
    "w": 204,
    "h": 300,
    "title": "Global Secure Access",
    "title2": "",
    "sub": [
     "Secure Web and AI Gateway",
     "Web content filtering",
     "Threat intelligence",
     "Network file filtering"
    ],
    "desc": "Secure Web and AI Gateway for Copilot Studio agents (shown as Global Secure Access for agents in the Power Platform admin center) forwards traffic from HTTP nodes, custom connectors and MCP connectors, for supported connectors, through Global Secure Access. It applies web content filtering, threat intelligence filtering and network file filtering. Baseline profile only; Conditional Access–linked security profiles aren’t supported. It doesn’t carry the agent’s model calls, Bing or public-website knowledge, or Dataverse knowledge. Requires Agent 365. Copilot Studio agents don’t use the AI Gateway.",
    "kind": "gw"
   },
   {
    "id": "mcp",
    "x": 836,
    "y": 110,
    "w": 324,
    "h": 64,
    "title": "MCP servers & tools",
    "title2": "",
    "sub": [
     "Microsoft and custom servers"
    ],
    "desc": "MCP servers Copilot Studio agents call through MCP connectors, from Microsoft (Work IQ, Microsoft 365) or your own. Data policies decide which are allowed, makers can turn off single tools, and GSA filters the traffic.",
    "kind": ""
   },
   {
    "id": "conn",
    "x": 836,
    "y": 250,
    "w": 324,
    "h": 64,
    "title": "Connectors & HTTP",
    "title2": "",
    "sub": [
     "Custom connectors · REST APIs · web"
    ],
    "desc": "Custom connectors and HTTP requests the agent makes. With Secure Web and AI Gateway on, traffic from HTTP nodes and supported connectors goes through GSA; existing custom connectors must be edited and saved again to be covered.",
    "kind": ""
   },
   {
    "id": "data",
    "x": 20,
    "y": 530,
    "w": 1160,
    "h": 90,
    "title": "✓ Protected end to end",
    "title2": "",
    "sub": [
     "Agent 365 registry",
     "Entra Agent ID",
     "Purview DSPM & labels",
     "Defender (preview)"
    ],
    "desc": "Copilot Studio agents join Agent 365 once it’s enabled, and new agents get an Entra Agent ID that admins can target with Conditional Access (requires Agent 365). Purview covers audit, DSPM and sensitivity labels; Purview DLP for agents is limited (SharePoint knowledge through the Microsoft 365 Copilot location). Defender real-time protection during agent runtime (preview) checks tool calls. Defender XDR correlates alerts.",
    "kind": "band base"
   }
  ],
  "wires": [
   {
    "pts": [
     [
      228,
      122
     ],
     [
      278,
      122
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      406,
      170
     ],
     [
      406,
      248
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      228,
      278
     ],
     [
      278,
      278
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      228,
      354
     ],
     [
      278,
      354
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      532,
      315
     ],
     [
      578,
      315
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      784,
      142
     ],
     [
      834,
      142
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      784,
      282
     ],
     [
      834,
      282
     ]
    ],
    "arrow": true
   }
  ],
  "connectors": [],
  "paths": {},
  "scenarios": []
 },
 {
  "id": "foundry",
  "label": "Foundry",
  "title": "Microsoft Foundry agents",
  "take": "Route model and tool calls through one gateway you control.",
  "defaultNode": "gw2",
  "columns": [
   {
    "x": 24,
    "w": 230,
    "label": "WHO'S ASKING",
    "sub": "Callers"
   },
   {
    "x": 274,
    "w": 290,
    "label": "ACCESS & AGENTS",
    "sub": "Foundry"
   },
   {
    "x": 584,
    "w": 232,
    "label": "CONTROL POINT",
    "sub": "Azure"
   },
   {
    "x": 836,
    "w": 340,
    "label": "WHAT THEY REACH",
    "sub": "Models & tools"
   }
  ],
  "nodes": [
   {
    "id": "user",
    "x": 40,
    "y": 80,
    "w": 198,
    "h": 56,
    "title": "Employees",
    "title2": "",
    "sub": [
     "Use your custom AI apps"
    ],
    "desc": "A person on a managed device using AI through a browser, desktop app or Copilot.",
    "kind": ""
   },
   {
    "id": "endpoint",
    "x": 40,
    "y": 144,
    "w": 198,
    "h": 52,
    "title": "Endpoint controls",
    "title2": "",
    "sub": [
     "Intune · Defender · DLP"
    ],
    "desc": "Purview Endpoint DLP (with browser protection) blocks pasting or uploading sensitive data to AI sites; devices must be onboarded, and Chrome or Firefox on Windows need the Purview extension. Apps marked Unsanctioned in Defender for Cloud Apps sync to Defender for Endpoint, and network protection in block mode enforces the block. Intune compliance feeds Conditional Access.",
    "kind": "ctl"
   },
   {
    "id": "ext",
    "x": 40,
    "y": 400,
    "w": 198,
    "h": 56,
    "title": "External agent",
    "title2": "",
    "sub": [
     "Partner · A2A"
    ],
    "desc": "An agent outside your tenant calling your agents agent-to-agent (A2A). API Management can expose JSON-RPC A2A agent APIs and govern them with policies, credentials and IP filtering.",
    "kind": ""
   },
   {
    "id": "gw1",
    "x": 290,
    "y": 80,
    "w": 258,
    "h": 104,
    "title": "Entra Conditional Access",
    "title2": "",
    "sub": [
     "At sign-in · GSA on the path"
    ],
    "desc": "Employees sign in to your custom AI apps with Entra ID, where Conditional Access checks user, device and risk. When their traffic goes through the GSA client, web content filtering and Prompt Injection Protection apply too (Prompt Injection Protection needs TLS inspection and Entra-joined or hybrid-joined Windows). The agents’ own model and tool calls go through the AI Gateway.",
    "kind": "gw"
   },
   {
    "id": "agent",
    "x": 290,
    "y": 240,
    "w": 258,
    "h": 120,
    "title": "Microsoft Foundry agents",
    "title2": "",
    "sub": [
     "Agents your teams build",
     "Guardrails (Content Safety)"
    ],
    "desc": "Agents built in the Foundry Agent Service, using tools such as OpenAPI, Code Interpreter and MCP. Foundry guardrails (Azure AI Content Safety) screen prompts and responses, including user prompt attacks and indirect attacks; agent guardrails are in preview. Foundry provisions an Entra Agent ID automatically, and published agents sync to the Agent 365 registry once Agent 365 is licensed.",
    "kind": ""
   },
   {
    "id": "gw2",
    "x": 600,
    "y": 200,
    "w": 200,
    "h": 260,
    "title": "AI Gateway",
    "title2": "",
    "sub": [
     "Azure API Management",
     "Auth · token limits",
     "Content safety",
     "Agent 365 Tools Gateway"
    ],
    "desc": "AI gateway in Microsoft Foundry (preview), built on Azure API Management (v2 tiers). One governed entry point between Foundry and custom agents and the models and tools they call: managed-identity authentication, token limits, content safety, semantic caching, load balancing and prompt and completion logging. MCP tools created in the Foundry portal can be governed through it (preview). With the Agent 365 Tools Gateway (preview) it inventories MCP servers and can block a server; blocking a single tool needs the new AI Gateway (preview). Agents use it only when configured to, so lock backends so the gateway is the only caller. Copilot Studio agents don’t use it by default.",
    "kind": "gw"
   },
   {
    "id": "model",
    "x": 852,
    "y": 90,
    "w": 308,
    "h": 56,
    "title": "AI models",
    "title2": "",
    "sub": [
     "Foundry · Anthropic · others"
    ],
    "desc": "Language models from Microsoft Foundry or other providers, including Anthropic Claude, reached through one gateway endpoint. API Management supports the Anthropic Messages API on its v2 tiers.",
    "kind": ""
   },
   {
    "id": "mcp",
    "x": 852,
    "y": 180,
    "w": 308,
    "h": 56,
    "title": "MCP servers & tools",
    "title2": "",
    "sub": [
     "Microsoft and custom servers"
    ],
    "desc": "MCP servers and tools agents call, from Microsoft (Work IQ, Microsoft 365) or your own. Copilot Studio agents reach them through Power Platform connectors, governed by data policies and optionally routed through GSA. Foundry agents configured to use the AI Gateway reach them there, where Agent 365 (preview) can inventory and block servers.",
    "kind": ""
   },
   {
    "id": "apis",
    "x": 852,
    "y": 270,
    "w": 308,
    "h": 56,
    "title": "APIs & built-in tools",
    "title2": "",
    "sub": [
     "OpenAPI · Code Interpreter"
    ],
    "desc": "Business APIs, data sources and built-in tools such as Code Interpreter and OpenAPI tools. API Management governs the calls; Defender for APIs monitors them.",
    "kind": ""
   },
   {
    "id": "data",
    "x": 20,
    "y": 530,
    "w": 1160,
    "h": 90,
    "title": "✓ Protected end to end",
    "title2": "",
    "sub": [
     "Agent 365 registry",
     "Entra Agent ID",
     "Defender for AI Services",
     "Purview DSPM"
    ],
    "desc": "Every Foundry agent gets an Entra Agent ID; published agents sync to Agent 365 once it’s enabled. Defender for AI Services raises alerts on Azure OpenAI and Model Inference calls (jailbreak, data leakage, credential theft). Defender CSPM AI security posture management finds AI workloads and attack paths. Purview DSPM covers Foundry apps and agents.",
    "kind": "band base"
   }
  ],
  "wires": [
   {
    "pts": [
     [
      139,
      136
     ],
     [
      139,
      144
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      238,
      170
     ],
     [
      288,
      170
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      419,
      184
     ],
     [
      419,
      238
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      548,
      300
     ],
     [
      598,
      300
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      238,
      428
     ],
     [
      598,
      428
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      800,
      298
     ],
     [
      850,
      298
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      826,
      118
     ],
     [
      826,
      298
     ]
    ],
    "arrow": false
   },
   {
    "pts": [
     [
      826,
      118
     ],
     [
      850,
      118
     ]
    ],
    "arrow": true
   },
   {
    "pts": [
     [
      826,
      208
     ],
     [
      850,
      208
     ]
    ],
    "arrow": true
   }
  ],
  "connectors": [],
  "paths": {},
  "scenarios": []
 }
];

export const SCENARIOS: Scenario[] = [];

export const ARCH = {
 "h2": "Four layers, two gateways",
 "take": "Four layers, two gateways. The controls have to work together.",
 "actionTake": "Every request runs through the same controls and lands in one SOC view."
};

export const GATEWAYS: { h2: string; flow: Flow[]; heads: Head[]; rows: GridRow[]; note: string; take: string } = {
 "h2": "Network and API gateways: separate configured paths",
 "flow": [],
 "heads": [
  {
   "title": "Global Secure Access",
   "sub": "Acquired device/branch traffic and supported Studio agent egress"
  },
  {
   "title": "API Management AI gateway",
   "sub": "Explicitly routed model, MCP and A2A APIs; capabilities vary by tier"
  }
 ],
 "rows": [
  {
   "label": "Where it sits",
   "owner": "",
   "cells": [
    [
     "Enabled forwarding profiles acquire selected device or remote-network traffic. Copilot Studio uses a separate enabled integration for supported agent egress."
    ],
    [
     "API Management governs calls sent to its configured endpoints. Model, remote MCP, REST and imported A2A APIs have distinct policies and support."
    ]
   ]
  },
  {
   "label": "How traffic gets there",
   "owner": "",
   "cells": [
    [
     "Enable and assign Microsoft/Internet profiles for the destinations in scope; unmatched and bypassed traffic remains outside that route.",
     "Validate client platform and per-feature prerequisites. Clientless remote networks use baseline policies; user-aware profiles require the client.",
     "Device prompt/MCP payload inspection needs supported routing and TLS inspection. Enabled Studio MCP logging has a documented TLS-configuration exception.",
     "Enable Studio forwarding per environment/group and configure baseline policies; resave existing custom connectors as documented."
    ],
    [
     "Connect and enable the gateway for applicable Foundry projects and model APIs.",
     "Foundry MCP governance is preview and creation-time scoped: new portal-created eligible MCP tools, excluding managed OAuth, code-first MCP, OpenAPI and native tools.",
     "For inbound A2A, import an existing compatible JSON-RPC backend and configure authentication and policies."
    ]
   ]
  },
  {
   "label": "See",
   "owner": "",
   "cells": [
    [
     "Catalog-based Shadow AI discovery identifies matched SaaS destinations and risk.",
     "Generative AI Insights (preview) logs supported prompts and remote MCP payloads; it is not universal app or local/stdio discovery."
    ],
    [
     "Configure token metrics and prompt/completion logging for supported model traffic.",
     "Connected-gateway inventory through Agent 365 (preview) covers registered MCP servers; tool-level execution traces require separate instrumentation."
    ]
   ]
  },
  {
   "label": "Protect",
   "owner": "",
   "cells": [
    [
     "Configured web/content/threat policies govern acquired supported traffic.",
     "Prompt Injection Protection supports configured JSON text prompts; file inspection is separate and long prompts have truncation limits.",
     "Scan with Purview needs matching GSA and inline-web DLP rules, supported Entra user identity and content format. Size, encoding and inspection failures can leave content uninspected or fail open.",
     "MCP firewall (preview) covers remote HTTP/SSE MCP, not local/stdio or unsupported JSON-RPC batches.",
     "Tenant restrictions and compliant-network checks apply to their documented Microsoft-authenticated resources, not arbitrary vendor credentials."
    ],
    [
     "Configure supported API authentication, rate/IP restrictions and backend access controls.",
     "Model token/content-safety policies apply only to supported routed model APIs; they are not generic MCP content filters.",
     "APIM v2 supports connected MCP inventory and whole-server blocking. Single-tool controls depend on supported gateway and static tool configuration; replacement-resource parity is not assumed."
    ]
   ]
  },
  {
   "label": "Control and scale",
   "owner": "",
   "cells": [
    [
     "User-aware client security profiles can use Conditional Access. Tenant baseline policies also apply; remote-network and Studio integrations do not use per-user Conditional Access-linked profiles."
    ],
    [
     "Supported APIM features include backend load balancing, circuit breaking and semantic caching with prerequisites. The dedicated AI Gateway preview resource has a separate feature set and roadmap."
    ]
   ]
  },
  {
   "label": "Licensing",
   "owner": "",
   "cells": [
    [
     "Verify current user, feature and cloud entitlements: Microsoft traffic requires Entra P1/P2; Internet Access requires its entitlement or Entra Suite plus prerequisites.",
     "Scan with Purview needs applicable Purview licensing and setup. Extending Entra security to agents requires Agent 365.",
     "GCC availability is feature-specific; do not infer GCC High, DoD or other sovereign-cloud support."
    ],
    [
     "APIM tier support and Azure charges vary by feature. Anthropic Messages API requires v2 in current guidance.",
     "Agent 365 gateway integration is preview and entitlement-specific. The deprecated AIGateway SKU and replacement resource are not ordinary APIM v2 tiers.",
     "The new AI Gateway preview resource does not support the existing content-safety policy or private endpoints; validate migration needs separately."
    ]
   ]
  },
  {
   "label": "Who owns it",
   "owner": "",
   "cells": [
    [
     "Identity and network security teams"
    ],
    [
     "Platform, app and AI engineering teams"
    ]
   ]
  }
 ],
 "note": "Complementary, not interchangeable: device/branch acquisition, Studio agent egress, and configured model/tool API mediation are different paths. Discovery is not blocking; inspection requires supported traffic, applicable policy and tested enforcement.",
 "take": "Choose the controls required by each path and threat model. Neither gateway is mandatory for every deployment or sufficient for all AI traffic."
};

export const SHADOW: { h2: string; flow: Flow[]; heads: Head[]; rows: GridRow[]; talk: string; take: string } = {
 "h2": "Shadow AI is more than unsanctioned chatbots",
 "flow": [
  {
   "title": "Discover",
   "sub": "Find what's in use",
   "gw": false
  },
  {
   "title": "Decide",
   "sub": "Sanction, monitor or block",
   "gw": false
  },
  {
   "title": "Control",
   "sub": "Enforce supported paths; track gaps",
   "gw": false
  },
  {
   "title": "Monitor",
   "sub": "Watch for what's new",
   "gw": false
  }
 ],
 "heads": [
  {
   "title": "Shadow AI apps",
   "sub": "People using AI IT didn't approve"
  },
  {
   "title": "Shadow agents",
   "sub": "Unapproved, unmanaged or ownerless agents"
  },
  {
   "title": "Shadow MCP servers & tools",
   "sub": "What agents call without approval"
  }
 ],
 "rows": [
  {
   "label": "What it looks like",
   "owner": "",
   "cells": [
    [
     "Unapproved web AI, desktop apps, extensions or personal accounts handling work content. Discovery of a domain does not identify every personal-account session."
    ],
    [
     "Unapproved or unmanaged agents can still have owners. Separate ownerless registry entries from unregistered cloud agents and local endpoint agents."
    ],
    [
     "Unapproved MCP servers and exposed tools. CLI/coding agents are clients; MCP connectors and servers are not the same asset type."
    ]
   ]
  },
  {
   "label": "Discover",
   "owner": "Security + IT",
   "cells": [
    [
     "GSA catalog-based SaaS discovery and Defender for Cloud Apps risk scoring cover observed supported destinations.",
     "Purview DSPM adds supported data-risk visibility after onboarding."
    ],
    [
     "Review registry/platform inventory and lifecycle records.",
     "Use supported Defender cloud-agent inventory with required onboarding; endpoint Shadow AI Frontier discovery has separate E5/Intune/Defender prerequisites."
    ],
    [
     "Generative AI Insights (preview) sees supported remote MCP traffic, not local/stdio servers.",
     "Connected gateways and supported Agent 365 registration paths inventory their MCP servers; neither discovers every server everywhere."
    ]
   ]
  },
  {
   "label": "Decide",
   "owner": "CISO + business",
   "cells": [
    [
     "Tag apps sanctioned or unsanctioned in Defender for Cloud Apps",
     "Publish an approved AI app list"
    ],
    [
     "Assign an owner",
     "Keep, fix or retire each agent"
    ],
    [
     "Approve servers",
     "Choose which tools stay on"
    ]
   ]
  },
  {
   "label": "Control",
   "owner": "Identity, endpoint, platform",
   "cells": [
    [
     "Use configured GSA web/content policies and supported Prompt Injection Protection on acquired traffic.",
     "Intune deploys device and browser controls; GSA, Defender and Purview enforce their own configured network and data policies.",
     "Endpoint/browser DLP restricts supported sensitive-data actions. Unsanctioned tags need an enabled enforcement integration and blocking settings.",
     "Tenant restrictions cover supported Microsoft-authenticated accounts, not native personal ChatGPT or Claude credentials."
    ],
    [
     "Use correctly targeted Entra agent policies for supported token flows; API-key and unsupported identity paths need separate controls.",
     "Apply Purview policies only to supported agent instances, locations and interactions; generic agent output/tool DLP is not automatic.",
     "Shadow AI (Frontier preview) currently blocks OpenClaw execution through an Intune policy on enrolled Windows devices. Other detected desktop apps remain discovery-only in that workflow."
    ],
    [
     "Configure remote MCP firewall policies where acquisition and inspection are supported (preview).",
     "Power Platform advanced connector policies block supported MCP servers, not individual tools; classic policies still govern applicable custom/HTTP connectors.",
     "Agent 365 gateway actions depend on the connected product and configuration; single-tool support needs explicit validation."
    ]
   ]
  },
  {
   "label": "Monitor",
   "owner": "SOC",
   "cells": [
    [
     "Purview data-risk insights and configured app/endpoint/network telemetry.",
     "Defender alerts or hunting behaviors where supported—not every activity becomes an incident."
    ],
    [
     "Supported Agent 365 observability with platform-specific telemetry coverage.",
     "Validate cloud/endpoint posture visibility separately from runtime blocking."
    ],
    [
     "Remote MCP payload logs, gateway traffic logs and separately instrumented tool traces.",
     "Validate logging/retention and ingestion; inventory alone is not runtime evidence."
    ]
   ]
  }
 ],
 "talk": "You can't block your way out of shadow AI. Find it, offer a sanctioned option, guard the data.",
 "take": "Discover supported activity, decide what is acceptable, enforce configured paths and document blind spots. Inventory, discovery and blocking are separate capabilities."
};

export const FRAMEWORK: { h2: string; rows: FrameworkRow[]; take: string } = {
 "h2": "Every layer, its risks and what protects it",
 "rows": [
  {
   "layer": "AI usage",
   "sub": "People, devices, apps",
   "risks": [
    "Shadow AI apps",
    "Approved & third-party AI",
    "External agents"
   ],
   "cells": [
    {
     "items": [
      "GSA shadow AI discovery",
      "Defender for Cloud Apps: AI app catalog"
     ],
     "gw": false,
     "shadow": true
    },
    {
     "items": [
      "Global Secure Access: web filtering, prompt injection, Purview DLP",
      "Endpoint DLP + browser",
      "Defender for Endpoint + Intune"
     ],
     "gw": true,
     "shadow": false
    },
    {
     "items": [
      "Conditional Access for AI apps",
      "Sanctioned app list",
      "Purview AI connectors (Claude, ChatGPT Enterprise)"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Defender XDR alerts",
      "Purview DSPM"
     ],
     "gw": false,
     "shadow": false
    }
   ]
  },
  {
   "layer": "Agent core",
   "sub": "Copilot Studio, Foundry",
   "risks": [
    "Agent actions & shadow agents"
   ],
   "cells": [
    {
     "items": [
      "Agent 365 registry",
      "Entra Agent ID"
     ],
     "gw": false,
     "shadow": true
    },
    {
     "items": [
      "Purview DLP for agents",
      "Defender agent protection (preview)"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Owners + Conditional Access for agents",
      "Insider Risk + Communication Compliance"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Agent security posture",
      "Agent 365 observability"
     ],
     "gw": false,
     "shadow": false
    }
   ]
  },
  {
   "layer": "Tools & MCP",
   "sub": "Tools, APIs, MCP servers",
   "risks": [
    "Tool & MCP abuse",
    "Built-in tool misuse"
   ],
   "cells": [
    {
     "items": [
      "Generative AI Insights (GSA)",
      "MCP server inventory (Agent 365 + API Management)"
     ],
     "gw": true,
     "shadow": true
    },
    {
     "items": [
      "GSA MCP firewall",
      "Secure Web & AI GW",
      "Work IQ MCP + Defender runtime blocks"
     ],
     "gw": true,
     "shadow": false
    },
    {
     "items": [
      "Power Platform connector policies (Copilot Studio)",
      "Block a server or tool in the AI Gateway (Agent 365, preview)"
     ],
     "gw": true,
     "shadow": false
    },
    {
     "items": [
      "Gateway runtime signals",
      "GSA traffic logs"
     ],
     "gw": true,
     "shadow": false
    }
   ]
  },
  {
   "layer": "AI platform",
   "sub": "Models, training data",
   "risks": [
    "Model abuse & jailbreaks",
    "Training data exposure"
   ],
   "cells": [
    {
     "items": [
      "AI security posture management: AI inventory"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Content safety + token limits in AI Gateway",
      "AI model scanning (preview)"
     ],
     "gw": true,
     "shadow": false
    },
    {
     "items": [
      "One gateway endpoint across providers"
     ],
     "gw": true,
     "shadow": false
    },
    {
     "items": [
      "Defender for AI Services"
     ],
     "gw": false,
     "shadow": false
    }
   ]
  },
  {
   "layer": "AI data",
   "sub": "Underneath everything",
   "risks": [
    "Oversharing",
    "Sensitive data leaving"
   ],
   "cells": [
    {
     "items": [
      "Purview DSPM",
      "Data classification"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Sensitivity labels",
      "DLP everywhere"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Retention + eDiscovery"
     ],
     "gw": false,
     "shadow": false
    },
    {
     "items": [
      "Insider Risk Management"
     ],
     "gw": false,
     "shadow": false
    }
   ]
  }
 ],
 "take": "Every layer covered from discovery to response."
};

export const ROLLOUT: { h2: string; heads: string[]; rows: GridRow[]; next: { title: string; text: string }[]; take: string; sources: { href: string; label: string }[]; preview: string } = {
 "h2": "See it, guard it, govern it",
 "heads": [
  "See it",
  "Guard it",
  "Govern it"
 ],
 "rows": [
  {
   "label": "Goal",
   "owner": "",
   "cells": [
    [
     "Establish scoped visibility while containing known high-risk use."
    ],
    [
     "Map enforcement to real identity, application, network, tool and data paths."
    ],
    [
     "Maintain ownership, tested policies and review cadence as AI changes."
    ]
   ]
  },
  {
   "label": "Key actions",
   "owner": "",
   "cells": [
    [
     "Inventory supported AI apps, agents and MCP servers; record discovery sources and blind spots.",
     "Enable applicable DSPM/audit visibility; pilot supported DLP rules and verify collection.",
     "Assign accountable owners and document unsupported or unobserved assets."
    ],
    [
     "Configure applicable endpoint, browser, network and source-data controls.",
     "Route customer-configurable model and eligible MCP APIs through the selected gateway; record direct/native and Microsoft-managed exclusions.",
     "Test allow/block/audit modes, error handling, backend anti-bypass and required approval workflows."
    ],
    [
     "Record each approved agent’s owner, actual authentication principal and least-privilege permissions.",
     "Use supported identity and gateway governance; do not assume every agent or tool supports identical controls.",
     "Validate SOC telemetry, detection, response and rollback playbooks."
    ]
   ]
  },
  {
   "label": "Focus",
   "owner": "",
   "cells": [
    [
     "Visibility first"
    ],
    [
     "Blocking and guardrails"
    ],
    [
     "Ongoing control"
    ]
   ]
  },
  {
   "label": "Who",
   "owner": "",
   "cells": [
    [
     "Security + IT"
    ],
    [
     "Identity, endpoint and platform teams"
    ],
    [
     "CISO, SOC and agent owners"
    ]
   ]
  },
  {
   "label": "Done when",
   "owner": "",
   "cells": [
    [
     "Discovery coverage, in-scope owners, unknowns and recurring review are documented."
    ],
    [
     "Representative tests pass for supported paths; bypasses, skipped/fail-open inspections and exceptions have owners and remediation plans."
    ],
    [
     "Applicable policies, identity models and monitoring are tested for approved agents; residual risks and cloud/license constraints are accepted and reviewed."
    ]
   ]
  }
 ],
 "next": [
  {
   "title": "Discovery workshop",
   "text": "Agree in-scope workflows, data, identities and success tests"
  },
  {
   "title": "Visibility first",
   "text": "Pilot supported controls and validate audit/block behavior"
  },
  {
   "title": "Pilot guardrails",
   "text": "Verify configured gateway paths and document bypasses"
  },
  {
   "title": "Agent review",
   "text": "Assign owners, exceptions, monitoring and recurring reviews"
  }
 ],
 "take": "See it, guard it, govern it.",
 "sources": [
  {
   "href": "https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-internet-access",
   "label": "Entra Internet Access"
  },
  {
   "href": "https://learn.microsoft.com/en-us/azure/api-management/genai-gateway-capabilities",
   "label": "AI gateway in API Management"
  },
  {
   "href": "https://learn.microsoft.com/en-us/azure/ai-gateway/ai-gateway-resource",
   "label": "AI Gateway migration and limitations"
  },
  {
   "href": "https://learn.microsoft.com/en-us/azure/api-management/agent-365",
   "label": "Agent 365 + API Management (preview)"
  },
  {
   "href": "https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/governance",
   "label": "Foundry MCP governance"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-mcp-firewall",
   "label": "GSA MCP firewall (preview)"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-ai-prompt-injection-protection",
   "label": "GSA prompt injection protection"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-secure-web-ai-gateway-agents",
   "label": "Secure Web and AI Gateway for Copilot Studio agents"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-shadow-ai-discovery",
   "label": "Shadow AI discovery"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding",
   "label": "GSA traffic forwarding profiles"
  },
  {
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-network-content-filtering",
   "label": "GSA content policies with Purview"
  },
  {
   "href": "https://learn.microsoft.com/en-us/purview/ai-claude-enterprise",
   "label": "Purview for Claude Enterprise (preview)"
  },
  {
   "href": "https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-security-posture",
   "label": "AI security posture management"
  },
  {
   "href": "https://learn.microsoft.com/en-us/security/security-for-ai/agent-365-security",
   "label": "Agent 365 security"
  },
  {
   "label": "Studio identity and channel scope",
   "href": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/govern-agents-identities-overview"
  },
  {
   "label": "Studio Purview support",
   "href": "https://learn.microsoft.com/en-us/purview/ai-copilot-studio"
  },
  {
   "label": "Custom-agent Purview enforcement",
   "href": "https://learn.microsoft.com/en-us/purview/developer/secure-ai-with-purview"
  },
  {
   "label": "Restricted Content Discovery limits",
   "href": "https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery"
  },
  {
   "label": "Foundry Purview integration",
   "href": "https://learn.microsoft.com/en-us/azure/foundry/control-plane/how-to-manage-compliance-security"
  },
  {
   "label": "Agent 365 GCC feature availability",
   "href": "https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-agent-365/microsoft-agent-365"
  },
  {
   "label": "APIM A2A backend prerequisites",
   "href": "https://learn.microsoft.com/en-us/azure/api-management/agent-to-agent-api"
  },
  {
   "label": "Copilot agent entitlements",
   "href": "https://learn.microsoft.com/en-us/copilot/manage/manage-agents-copilot-chat"
  },
  {
   "label": "Foundry gateway configuration",
   "href": "https://learn.microsoft.com/en-us/azure/foundry/configuration/enable-ai-api-management-gateway-portal"
  },
  {
   "label": "Defender for AI Services scope",
   "href": "https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-threat-protection"
  },
  {
   "label": "Power Platform connector policy scope",
   "href": "https://learn.microsoft.com/en-us/power-platform/admin/advanced-connector-policies"
  },
  {
   "label": "SAM features included with Copilot",
   "href": "https://learn.microsoft.com/en-us/sharepoint/sharepoint-advanced-management-features-copilot-license"
  },
  {
   "label": "Agent 365 BYO MCP registration",
   "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/manage-byo-mcp-server"
  },
  {
   "label": "Agent network controls GA announcement",
   "href": "https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/"
  }
 ],
 "preview": "Documentation review: November 4, 2026. Validate per-feature preview status, licensing, target-cloud support and applicable Product Terms. Agent network controls are GA; MCP firewall, GenAI Insights, Foundry MCP governance, selected Defender runtime paths and other named previews retain their own limits. New AI Gateway individual-tool support and some registry/billing guidance remain documentation-dependent."
};

export const REF: { h2: string; defaultSurface: string; take: string; scopeNote: string; sources: { label: string; href: string }[]; layers: RefLayer[]; pillars: RefPillar[] } = {
 "h2": "AI security reference architecture",
 "defaultSurface": "copilot",
 "layers": [
  {
   "id": "people",
   "label": "People & devices",
   "surfaces": [
    {
     "id": "employees",
     "title": "Employees",
     "sub": "Managed devices · browsers",
     "desc": "People using AI from managed devices. Entra policies, device checks and network inspection apply only where authentication, routing and enforcement are configured."
    },
    {
     "id": "builders",
     "title": "Makers & developers",
     "sub": "Copilot Studio · Foundry · code",
     "desc": "Makers and developers build agents and apps. Governance depends on the platform: Power Platform policies control supported Studio connectivity; gateways govern explicitly routed calls; Agent 365 provides supported inventory and platform-specific lifecycle controls. Custom-code paths need separate authorization and safeguards."
    },
    {
     "id": "partners",
     "title": "Partners & external agents",
     "sub": "Guests · agent-to-agent callers",
     "desc": "Outside people and agents calling your apps and agents, through Entra guest access or the AI Gateway’s agent-to-agent APIs."
    }
   ]
  },
  {
   "id": "apps",
   "label": "AI apps",
   "surfaces": [
    {
     "id": "copilot",
     "title": "Microsoft Copilot",
     "sub": "Formerly Microsoft 365 Copilot",
     "desc": "Copilot respects user access permissions. Licensed capabilities provide broad organizational grounding; Copilot Chat grounding depends on the app, supplied content and supported agents. Labels, DLP and permissions require configuration."
    },
    {
     "id": "thirdparty",
     "title": "Third-party AI",
     "sub": "Claude · ChatGPT Enterprise",
     "desc": "Approved vendor AI, such as Claude or ChatGPT Enterprise. GSA covers acquired device traffic. Hosted Microsoft 365 connectors use separate, vendor-specific access paths; local connectors can use the device network."
    },
    {
     "id": "shadowai",
     "title": "Shadow AI apps",
     "sub": "Web · desktop · personal accounts",
     "desc": "Unapproved AI websites, desktop agents, browser extensions and personal-account use. Web filtering, device policies and data protection address different risks; no single inventory covers every path."
    }
   ]
  },
  {
   "id": "agents",
   "label": "Agents",
   "surfaces": [
    {
     "id": "studio",
     "title": "Copilot Studio agents",
     "sub": "Low-code agents",
     "desc": "Copilot Studio agents use configured tools, connectors, MCP and knowledge. Agent identity provisioning depends on the harness and legacy state; verify registry visibility after onboarding, publication and sharing. Supported tool egress can use Secure Web & AI GW. Microsoft-managed model calls and documented excluded knowledge/tool requests do not follow that GSA path."
    },
    {
     "id": "foundry",
     "title": "Foundry agents & custom AI apps",
     "sub": "Pro-code agents",
     "desc": "Foundry agents can route model calls and eligible MCP calls through a configured gateway. Tool governance excludes existing unmediated tools, managed OAuth, code-first MCP, OpenAPI and native tools such as SharePoint."
    },
    {
     "id": "local",
     "title": "Local & custom agents",
     "sub": "CLI and coding agents",
     "desc": "Agents and coding tools running on a device that call AI services and remote MCP servers directly, outside any agent platform."
    }
   ]
  },
  {
   "id": "data",
   "label": "Models, tools & data",
   "surfaces": [
    {
     "id": "models",
     "title": "AI models",
     "sub": "Foundry · Anthropic · others",
     "desc": "Language models from Microsoft Foundry and other providers, ideally reached only through one governed gateway endpoint."
    },
    {
     "id": "mcp",
     "title": "MCP servers & tools",
     "sub": "Microsoft and custom servers",
     "desc": "MCP servers and tools that agents call, from Microsoft (Work IQ, Microsoft 365) or your own. Approved and unapproved servers both need governing."
    },
    {
     "id": "connectors",
     "title": "Connectors & APIs",
     "sub": "Custom connectors · REST · OpenAPI",
     "desc": "Connectors and business APIs that agents use to read and act on systems."
    },
    {
     "id": "m365data",
     "title": "Microsoft 365 data",
     "sub": "SharePoint · OneDrive · Exchange · Teams",
     "desc": "SharePoint, OneDrive, Exchange and Teams content can ground supported AI experiences. Existing permissions, content protection and configured grounding scope determine access; oversharing remains a material risk."
    }
   ]
  }
 ],
 "pillars": [
  {
   "id": "identity",
   "label": "Identity & access",
   "band": false,
   "products": [
    {
     "id": "entra",
     "title": "Entra ID & Conditional Access",
     "sub": "Sign-in · MFA · device checks",
     "desc": "Conditional Access governs Entra-authenticated access using configured identity, risk and device conditions. Public services using other sign-ins or API keys require separate controls; GSA can enforce network-based policies.",
     "preview": false,
     "protects": [
      {
       "id": "employees",
       "how": "Configured Conditional Access policies can require MFA and compliant devices. Tenant restrictions apply to supported Microsoft-authenticated access, not personal Claude or ChatGPT logins.",
       "kind": "protect"
      },
      {
       "id": "copilot",
       "how": "Sign-in, MFA and Conditional Access protect Copilot; policies that target all resources cover it.",
       "kind": "protect"
      },
      {
       "id": "thirdparty",
       "how": "Consent, assignment and applicable Conditional Access govern Microsoft-authenticated access. Validate each provider’s delegated-token and device/network context; vendor web sessions are not automatically covered by the same policies.",
       "kind": "protect"
      },
      {
       "id": "partners",
       "how": "Guest access governed by Conditional Access.",
       "kind": "protect"
      },
      {
       "id": "shadowai",
       "how": "Blocks shadow AI websites only through Global Secure Access: a policy targets all internet resources and links a security profile that filters the Artificial Intelligence category or chosen sites. Conditional Access alone only covers apps that sign in with Entra.",
       "kind": "protect"
      },
      {
       "id": "studio",
       "how": "Apply policies to the correct supported Entra token subject. Studio agent-identity connector-scope enforcement is currently Teams-specific; other channels and custom tools retain their documented authentication limits.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "Conditional Access for agents applies to Foundry agent identities (Agent 365).",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "intune",
       "how": "Uses Intune compliance in configured Conditional Access grant controls for supported resources. This is distinct from blocking public AI sites or personal vendor accounts.",
       "sources": [
        {
         "label": "Require device compliance with Conditional Access",
         "href": "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance"
        }
       ]
      },
      {
       "id": "idp",
       "how": "Risk-based policies act on user and sign-in risk."
      },
      {
       "id": "gsa",
       "how": "Universal Conditional Access and the compliant network check run on GSA traffic."
      },
      {
       "id": "agentid",
       "how": "Conditional Access for agents targets agent identities, blueprints and agent users; policies scoped to users don’t cover agent users."
      }
     ]
    },
    {
     "id": "idp",
     "title": "Entra ID Protection",
     "sub": "User, sign-in & agent risk",
     "desc": "ID Protection supplies supported identity-risk signals. Agent risk detections are offline; delegated activity contributes to user risk. Risk-based enforcement requires correctly targeted Conditional Access, licensing and supported token flows. Reporting entitlement and enforcement entitlement are not interchangeable.",
     "preview": false,
     "protects": [
      {
       "id": "employees",
       "how": "Risky users and sign-ins are blocked or challenged.",
       "kind": "protect"
      },
      {
       "id": "studio",
       "how": "Agent-risk policies evaluate supported autonomous identities; delegated risk belongs to the user. Enforce the correct token subject with applicable preview, license and channel prerequisites.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "Same agent-risk policies for autonomous Foundry agent identities (preview; Agent 365 + Entra ID P2).",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "entra",
       "how": "Conditional Access acts on its risk scores."
      },
      {
       "id": "xdr",
       "how": "Its alerts are grouped into Defender XDR incidents."
      },
      {
       "id": "agentid",
       "how": "ID Protection for agents covers Entra agent identities."
      }
     ]
    },
    {
     "id": "agentid",
     "title": "Entra Agent ID",
     "sub": "An identity for every agent",
     "desc": "Entra Agent ID provides agent identities and blueprints. New Studio agents receive identities automatically; legacy Studio and Foundry agents can differ. Conditional Access and risk features require their documented licenses and configuration.",
     "preview": false,
     "protects": [
      {
       "id": "studio",
       "how": "New agents get an Entra Agent ID automatically.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "New-model Foundry agents receive individual identities. Legacy agents can share a project identity; downstream permissions are granted separately.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "a365",
       "how": "Agent 365 (or Microsoft 365 E7) is required for Conditional Access on agents; ID Protection for agents will soon require it too."
      },
      {
       "id": "entra",
       "how": "Conditional Access for agents targets the agent identity."
      }
     ]
    }
   ]
  },
  {
   "id": "devnet",
   "label": "Devices & network",
   "band": false,
   "products": [
    {
     "id": "intune",
     "title": "Intune",
     "sub": "Device policies & compliance",
     "desc": "Manages device configuration and compliance, deploys endpoint and browser controls, and applies supported desktop-agent blocking policies. It is not an AI traffic inspection service.",
     "preview": false,
     "protects": [
      {
       "id": "employees",
       "how": "Supplies device compliance to configured Entra Conditional Access policies. This controls supported resource access, not every public AI site or personal account.",
       "kind": "protect",
       "sources": [
        {
         "label": "Require device compliance with Conditional Access",
         "href": "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance"
        }
       ]
      },
      {
       "id": "builders",
       "how": "Deploys device configuration and compliance policies to managed maker and developer devices; the same supported-access limits apply.",
       "kind": "protect",
       "sources": [
        {
         "label": "Require device compliance with Conditional Access",
         "href": "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance"
        }
       ]
      },
      {
       "id": "shadowai",
       "how": "Shadow AI (Frontier preview) creates an Intune execution-blocking policy for OpenClaw on enrolled Windows devices. Other detected apps are not automatically blocked by this workflow.",
       "kind": "protect",
       "sources": [
        {
         "label": "Shadow AI in Microsoft 365 admin center (Preview)",
         "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
        }
       ]
      }
     ],
     "works": [
      {
       "id": "entra",
       "how": "Configured Conditional Access can require Intune device compliance for supported resources. Compliance alone does not block public AI websites or personal vendor accounts.",
       "sources": [
        {
         "label": "Require device compliance with Conditional Access",
         "href": "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance"
        }
       ]
      },
      {
       "id": "mde",
       "how": "Intune deploys Defender onboarding and network-protection policies; Defender device risk informs configured compliance. Enforcement needs the relevant Defender integration and blocking mode.",
       "sources": [
        {
         "label": "Configure Microsoft Defender for Endpoint with Intune and onboard devices",
         "href": "https://learn.microsoft.com/en-us/intune/device-security/microsoft-defender/configure-integration"
        },
        {
         "label": "Configure network protection in Microsoft Defender Antivirus",
         "href": "https://learn.microsoft.com/en-us/defender-endpoint/enable-network-protection"
        }
       ]
      },
      {
       "id": "gsa",
       "how": "Intune deploys and configures the Global Secure Access Windows client. GSA forwarding profiles and security policies determine traffic acquisition and enforcement.",
       "sources": [
        {
         "label": "Install the Global Secure Access client for Windows",
         "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-install-windows-client"
        }
       ]
      },
      {
       "id": "purview",
       "how": "Intune can force-install Purview extensions for Chrome and Firefox on Windows. Endpoint onboarding and Purview DLP policy scope determine supported data-action enforcement.",
       "sources": [
        {
         "label": "Get started with the Microsoft Purview extension for Chrome",
         "href": "https://learn.microsoft.com/en-us/purview/dlp-chrome-get-started"
        },
        {
         "label": "Get started with the Microsoft Purview extension for Firefox",
         "href": "https://learn.microsoft.com/en-us/purview/dlp-firefox-extension-get-started"
        }
       ]
      },
      {
       "id": "a365",
       "how": "The Shadow AI (Frontier) Block action creates an Intune device policy; current execution-blocking support is OpenClaw-only. Detection and policy application are separate.",
       "sources": [
        {
         "label": "Shadow AI in Microsoft 365 admin center (Preview)",
         "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
        }
       ]
      }
     ]
    },
    {
     "id": "gsa",
     "title": "Global Secure Access",
     "sub": "Internet + Microsoft traffic",
     "desc": "GSA protects traffic acquired by enabled and assigned forwarding profiles. Internet and Microsoft profiles cover different destinations. Bypass rules and unsupported traffic remain outside inspection; AI controls need their documented policies and prerequisites.",
     "preview": false,
     "protects": [
      {
       "id": "employees",
       "how": "Web content filtering, Prompt Injection Protection and Scan with Purview on device traffic.",
       "kind": "protect"
      },
      {
       "id": "builders",
       "how": "Configured profiles acquire makers’ and developers’ device traffic; unmatched or bypassed traffic is not inspected.",
       "kind": "protect"
      },
      {
       "id": "copilot",
       "how": "Generative AI Insights (preview) can log Microsoft Copilot prompts that flow through Internet Access with TLS inspection.",
       "kind": "observe"
      },
      {
       "id": "shadowai",
       "how": "Shadow AI discovery, and blocking of the Artificial Intelligence web category.",
       "kind": "protect"
      },
      {
       "id": "thirdparty",
       "how": "Configured web policies can allow, block and inspect supported AI traffic acquired by GSA; inspection is not automatic for every app.",
       "kind": "protect"
      },
      {
       "id": "local",
       "how": "MCP firewall (preview) allows or blocks remote MCP servers and tools; local stdio servers aren’t visible.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "GSA can provide configured access to Foundry-backed app endpoints. Internet Access prompt inspection needs TLS inspection and prompt policies; Private Access does not imply equivalent inspection.",
       "kind": "protect"
      },
      {
       "id": "mcp",
       "how": "MCP firewall and Generative AI Insights (both preview) cover MCP traffic from devices.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "entra",
       "how": "Universal Conditional Access and the compliant network check."
      },
      {
       "id": "mdca",
       "how": "Shadow AI discovery uses the Defender for Cloud Apps app catalog."
      },
      {
       "id": "purview",
       "how": "Scan with Purview sends uploads to Purview DLP for an allow or block decision."
      },
      {
       "id": "sentinel",
       "how": "GSA traffic logs reach Sentinel through Entra diagnostic settings and the Global Secure Access solution."
      }
     ]
    },
    {
     "id": "gsaagents",
     "title": "Secure Web & AI GW",
     "sub": "Secure Web and AI Gateway",
     "desc": "For supported Copilot Studio traffic, environment or group enablement applies GSA baseline filtering. Existing custom connectors need editing and saving. LLM, Bing, Dataverse/Azure SQL knowledge and unsupported tools bypass this integration. Agent 365 is required.",
     "preview": false,
     "protects": [
      {
       "id": "studio",
       "how": "Filters supported Studio HTTP-node and connector traffic after environment enablement; baseline profiles only. Model calls and unsupported destinations are excluded.",
       "kind": "protect"
      },
      {
       "id": "mcp",
       "how": "Filters Copilot Studio agents’ calls to MCP servers through MCP connectors.",
       "kind": "protect"
      },
      {
       "id": "connectors",
       "how": "Filters Copilot Studio agents’ custom connector and HTTP calls, plus listed supported connectors only.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "gsa",
       "how": "Runs on Global Secure Access, using its baseline profile."
      },
      {
       "id": "ppac",
       "how": "Complements data policies; turned on per environment in the Power Platform admin center (Security > Identity & access)."
      },
      {
       "id": "a365",
       "how": "Requires Agent 365."
      }
     ]
    },
    {
     "id": "aigw",
     "title": "API Management AI gateway",
     "sub": "APIM v2 · configured routing",
     "desc": "API Management v2 can provide Foundry model and eligible MCP governance when configured. This box is not the separate AI Gateway preview resource, whose supported policies differ. The legacy AIGateway SKU is deprecated.",
     "preview": false,
     "protects": [
      {
       "id": "foundry",
       "how": "Token limits, quotas and content safety on model calls; authentication, rate limits, IP filtering and logging on gateway-routed MCP tools (preview).",
       "kind": "protect"
      },
      {
       "id": "models",
       "how": "One authenticated endpoint in front of Foundry, Anthropic and other models.",
       "kind": "protect"
      },
      {
       "id": "mcp",
       "how": "This connected-gateway integration inventories registered MCP servers and applies supported gateway controls. Agent 365 also offers Microsoft-hosted tools and a separate BYO MCP registration path. Individual-tool support requires gateway-specific validation.",
       "kind": "protect"
      },
      {
       "id": "partners",
       "how": "Agent-to-agent APIs governed by policies, credentials and IP filtering.",
       "kind": "protect"
      },
      {
       "id": "connectors",
       "how": "API Management can govern published REST APIs. Foundry’s tool-governance integration covers eligible MCP tools only; model routing is a separate capability.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "a365",
       "how": "Supported connected gateways supply MCP inventory and governance. Legacy-tier and new-resource capabilities are not interchangeable; verify current support before relying on single-tool blocking."
      },
      {
       "id": "sentinel",
       "how": "Prompt and token logs can go to the Log Analytics workspace Sentinel uses."
      },
      {
       "id": "aispm",
       "how": "Defender CSPM inventories API Management APIs and flags unauthenticated or internet-exposed ones, including AI endpoints."
      }
     ]
    }
   ]
  },
  {
   "id": "data",
   "label": "Data security",
   "band": false,
   "products": [
    {
     "id": "purview",
     "title": "Purview labels & DLP",
     "sub": "Labels · DLP · Endpoint DLP",
     "desc": "Purview capabilities are platform- and integration-specific. Configured Copilot-location DLP can exclude supported labeled content from response processing, while citations can remain. Label inheritance applies only to supported generated content. Endpoint/browser DLP requires onboarded supported devices, policy scope and blocking actions. These are not automatic controls over arbitrary agent tool traffic.",
     "preview": false,
     "protects": [
      {
       "id": "copilot",
       "how": "Configure selected-label DLP rules for supported content. Email coverage starts January 1, 2025; calendar invites and direct prompt-upload file contents are outside this control. Supported generated content can inherit labels.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "Label-aware Azure AI Search requires supported indexing, user context and authorization. Custom-agent DLP enforcement needs the documented API or middleware integration at the relevant request, response or tool boundary.",
       "kind": "protect"
      },
      {
       "id": "shadowai",
       "how": "Endpoint DLP blocks paste and upload of sensitive data to AI sites on the device; Edge for Business blocks sensitive prompts to unmanaged AI apps inline.",
       "kind": "protect"
      },
      {
       "id": "thirdparty",
       "how": "Endpoint DLP and Scan with Purview protect inline; the Claude and ChatGPT Enterprise connectors don’t support DLP.",
       "kind": "protect"
      },
      {
       "id": "m365data",
       "how": "Configured encryption rights and supported DLP policies constrain content use. Classification alone is not access denial or a guarantee that every agent honors every label.",
       "kind": "protect"
      },
      {
       "id": "studio",
       "how": "Validate knowledge-source and channel coverage. Native DLP processing restrictions concern selected-label SharePoint knowledge in supported channels; labels alone do not exclude every source or protect arbitrary tool outputs.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "gsa",
       "how": "Scan with Purview inspects uploads on the network."
      },
      {
       "id": "xdr",
       "how": "DLP alerts, including device DLP, can join Defender XDR incidents once the default tuning rule is turned off."
      },
      {
       "id": "dspm",
       "how": "DSPM recommends DLP and label policies."
      }
     ]
    },
    {
     "id": "dspm",
     "title": "Purview DSPM",
     "sub": "Data posture · AI observability",
     "desc": "Purview DSPM consolidates posture and AI-risk insights and guides remediation. Purview Audit, eDiscovery and Insider Risk Management supply separate capabilities; configure each required solution rather than assuming DSPM enables them.",
     "preview": false,
     "protects": [
      {
       "id": "copilot",
       "how": "Shows Copilot data-risk and oversharing insights and recommends remediation. Audit and eDiscovery are separate Purview capabilities.",
       "kind": "observe"
      },
      {
       "id": "thirdparty",
       "how": "Visibility through the browser extension, network data security or the Claude (preview) and ChatGPT Enterprise connectors (pay-as-you-go).",
       "kind": "observe"
      },
      {
       "id": "shadowai",
       "how": "Shows sensitive data flowing to AI sites.",
       "kind": "observe"
      },
      {
       "id": "studio",
       "how": "Shows supported agent activity and risk insights when configured; Purview Audit supplies the audit records.",
       "kind": "observe"
      },
      {
       "id": "foundry",
       "how": "Enable the current supported Foundry integration and validate user context, collection and policy enforcement separately. Policy billing guidance differs between PAYG-only and PAYG-or-Agent 365; confirm current entitlements.",
       "kind": "observe"
      }
     ],
     "works": [
      {
       "id": "sam",
       "how": "Risk assessments point to the sites to fix with SharePoint Advanced Management."
      },
      {
       "id": "mdai",
       "how": "The older Defender for Cloud Purview setup is being deprecated and excludes Foundry agent context. Use current Foundry guidance; do not infer equivalent collection or enforcement across onboarding paths."
      }
     ]
    },
    {
     "id": "sam",
     "title": "SharePoint Advanced Management",
     "sub": "Oversharing cleanup",
     "desc": "SharePoint Advanced Management helps identify and remediate oversharing. Restricted access control limits access to configured groups. Restricted Content Discovery temporarily suppresses tenant-wide discovery; it does not revoke permissions or prevent permitted open-document use. Qualifying Copilot licenses include specified SAM features, not every add-on capability.",
     "preview": false,
     "protects": [
      {
       "id": "copilot",
       "how": "Restricted Content Discovery reduces tenant-wide discovery of selected sites while permissions are reviewed. Existing access and permitted open-document use remain; remediate source permissions separately.",
       "kind": "protect"
      },
      {
       "id": "m365data",
       "how": "Use access reports and owner reviews to identify excessive sharing, then change permissions, links or restricted-access settings. A review request itself does not remove access.",
       "kind": "protect"
      }
     ],
     "works": []
    }
   ]
  },
  {
   "id": "threat",
   "label": "Threat protection",
   "band": false,
   "products": [
    {
     "id": "mde",
     "title": "Defender for Endpoint",
     "sub": "Device threats · app blocks",
     "desc": "Protects devices and enforces app blocks. Apps marked Unsanctioned in Defender for Cloud Apps are blocked through network protection in block mode, and device risk can mark a device noncompliant in Intune.",
     "preview": false,
     "protects": [
      {
       "id": "employees",
       "how": "Device threat protection and risk scoring.",
       "kind": "protect"
      },
      {
       "id": "shadowai",
       "how": "Blocks unsanctioned AI app domains on the device.",
       "kind": "protect"
      },
      {
       "id": "local",
       "how": "Discovers supported local agents and MCP configurations. Runtime protection is separately enabled; blocking depends on supported inspection and Block mode.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "mdca",
       "how": "Enforces Unsanctioned app tags with network protection."
      },
      {
       "id": "intune",
       "how": "Defender supplies device risk for Intune compliance; Intune can deploy onboarding and network-protection policies. Audit mode does not block connections.",
       "sources": [
        {
         "label": "Configure Microsoft Defender for Endpoint with Intune and onboard devices",
         "href": "https://learn.microsoft.com/en-us/intune/device-security/microsoft-defender/configure-integration"
        },
        {
         "label": "Configure network protection in Microsoft Defender Antivirus",
         "href": "https://learn.microsoft.com/en-us/defender-endpoint/enable-network-protection"
        }
       ]
      },
      {
       "id": "xdr",
       "how": "Alerts correlate in Defender XDR incidents."
      }
     ]
    },
    {
     "id": "mdca",
     "title": "Defender for Cloud Apps",
     "sub": "AI app catalog · discovery",
     "desc": "Its app catalog has a risk-scored Generative AI category. Mark AI apps sanctioned or unsanctioned; unsanctioned apps are blocked through Defender for Endpoint, and GSA shadow AI discovery uses the same catalog.",
     "preview": false,
     "protects": [
      {
       "id": "shadowai",
       "how": "Discover AI apps in use and mark them unsanctioned.",
       "kind": "observe"
      },
      {
       "id": "thirdparty",
       "how": "Mark approved AI apps as sanctioned.",
       "kind": "observe"
      }
     ],
     "works": [
      {
       "id": "xdr",
       "how": "Part of Defender XDR."
      }
     ]
    },
    {
     "id": "mdai",
     "title": "Defender for AI Services",
     "sub": "AI threat protection",
     "desc": "A Defender for Cloud plan that raises alerts on Azure OpenAI and Azure AI Model Inference calls, such as jailbreak, data leakage and credential theft (text only). Alerts flow into Defender XDR incidents.",
     "preview": false,
     "protects": [
      {
       "id": "models",
       "how": "Runtime threat alerts on Azure OpenAI and Model Inference calls.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "Runtime threat alerts cover supported Azure OpenAI and Model Inference calls used by Foundry agents, not every third-party model.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "xdr",
       "how": "Alerts appear in Defender XDR incidents."
      },
      {
       "id": "aispm",
       "how": "Separate Defender for Cloud plans: Defender CSPM gives AI posture, Defender for AI Services gives runtime threat alerts. Agent-level posture needs Agent 365."
      }
     ]
    },
    {
     "id": "rtap",
     "title": "Defender agent protection",
     "sub": "Runtime checks for agents",
     "desc": "Cloud runtime protection uses platform-specific integrations and defaults to audit; scoped rules can block. Local runtime protection is separately enabled in Defender for Endpoint with supported inspection and licensing.",
     "preview": true,
     "protects": [
      {
       "id": "studio",
       "how": "Checks tool calls before they run (preview); Copilot Studio must be connected to Defender.",
       "kind": "protect"
      },
      {
       "id": "foundry",
       "how": "Checks user requests, agent responses, tool calls and tool responses at runtime (preview).",
       "kind": "protect"
      },
      {
       "id": "local",
       "how": "Defender for Endpoint runtime protection must be enabled on supported devices and agents. Block mode prevents matching actions; Audit mode only records them.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "a365",
       "how": "The Agent 365 tool-invocation path uses supported Work IQ MCP integration. Studio, Foundry and local protection have separately documented integrations."
      },
      {
       "id": "xdr",
       "how": "Investigate in Defender XDR advanced hunting."
      }
     ]
    }
   ]
  },
  {
   "id": "gov",
   "label": "Governance & posture",
   "band": false,
   "products": [
    {
     "id": "a365",
     "title": "Agent 365",
     "sub": "Agent registry · control plane",
     "desc": "Agent 365 centralizes supported agent inventory and platform-specific governance. Registry visibility depends on onboarding and lifecycle. Connected-platform synchronization is read-only; registry blocking does not universally stop source-platform execution.",
     "preview": false,
     "protects": [
      {
       "id": "copilot",
       "how": "Approve or block which agents people can use in Copilot.",
       "kind": "protect"
      },
      {
       "id": "studio",
       "how": "Verify the expected registry entry after applicable onboarding, publication and sharing. Identity provisioning and catalog/registry visibility are separate lifecycle events.",
       "kind": "observe"
      },
      {
       "id": "foundry",
       "how": "Supported published agents can sync after onboarding. Registry blocking can limit Copilot Chat availability rather than stop the underlying Foundry runtime.",
       "kind": "observe"
      },
      {
       "id": "thirdparty",
       "how": "Discovers supported desktop AI apps and inventories supported connected agent platforms (preview). Read-only synchronization does not protect vendor web sessions or stop source-platform execution.",
       "kind": "observe"
      },
      {
       "id": "local",
       "how": "Shadow AI (Frontier preview) uses Defender for Endpoint for supported desktop-agent discovery. Detection does not establish execution blocking; the current blocking support matrix is OpenClaw-only.",
       "kind": "observe",
       "sources": [
        {
         "label": "Shadow AI in Microsoft 365 admin center (Preview)",
         "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
        }
       ]
      },
      {
       "id": "shadowai",
       "how": "Shadow AI (Frontier preview) uses Defender for Endpoint for supported desktop-agent discovery. Detection does not establish execution blocking; the current blocking support matrix is OpenClaw-only.",
       "kind": "observe",
       "sources": [
        {
         "label": "Shadow AI in Microsoft 365 admin center (Preview)",
         "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
        }
       ]
      },
      {
       "id": "mcp",
       "how": "Connected gateways and documented hosted/BYO registration paths provide MCP inventory. Governance actions depend on gateway, tool configuration and entitlement; inventory does not reroute arbitrary tool traffic.",
       "kind": "protect"
      }
     ],
     "works": [
      {
       "id": "purview",
       "how": "Purview DLP, Insider Risk, labels, audit and eDiscovery for agents."
      },
      {
       "id": "sentinel",
       "how": "The Agent 365 connector (preview) brings agent telemetry into the Sentinel data lake."
      },
      {
       "id": "mde",
       "how": "Defender for Endpoint supplies supported desktop-agent detections to Shadow AI (Frontier preview); Intune supplies the separately applied blocking policy.",
       "sources": [
        {
         "label": "Shadow AI in Microsoft 365 admin center (Preview)",
         "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
        }
       ]
      },
      {
       "id": "xdr",
       "how": "Defender uses supported Agent 365 data for inventory, posture and detection. Runtime blocking requires a supported integration and configured blocking rules."
      }
     ]
    },
    {
     "id": "ppac",
     "title": "Power Platform data policies",
     "sub": "Copilot Studio governance",
     "desc": "Classic data policies govern connector grouping, including custom and HTTP connectors. Advanced connector policies use default-deny allowlists for supported connectors and whole MCP servers; authoring enforcement depends on rollout.",
     "preview": false,
     "protects": [
      {
       "id": "studio",
       "how": "Allow or block connectors and MCP servers per environment.",
       "kind": "protect"
      },
      {
       "id": "connectors",
       "how": "Classic policies sort connectors into business, non-business and blocked; advanced connector policies use a default-deny allowlist and can block whole MCP servers.",
       "kind": "protect"
      },
      {
       "id": "builders",
       "how": "Makers’ tool use is governed by applicable policies; authoring-time enforcement varies by connector type and portal rollout.",
       "kind": "protect"
      }
     ],
     "works": []
    },
    {
     "id": "aispm",
     "title": "AI security posture management",
     "sub": "Defender CSPM",
     "desc": "Defender CSPM discovers AI workloads, maps attack paths and highlights externally reachable AI endpoints. From July 2026, agent discovery and posture need Agent 365. AI model scanning (preview, part of Defender for AI Services) checks Azure Machine Learning models.",
     "preview": false,
     "protects": [
      {
       "id": "models",
       "how": "Finds exposed or misconfigured model endpoints.",
       "kind": "observe"
      },
      {
       "id": "foundry",
       "how": "Discovers Foundry accounts, projects and attack paths; agent-level discovery and posture need an Agent 365 license since July 2026.",
       "kind": "observe"
      }
     ],
     "works": [
      {
       "id": "xdr",
       "how": "Recommendations and attack paths show in the Defender portal."
      }
     ]
    }
   ]
  },
  {
   "id": "ops",
   "label": "Security operations",
   "band": true,
   "products": [
    {
     "id": "xdr",
     "title": "Defender XDR",
     "sub": "One incident queue",
     "desc": "Defender XDR correlates eligible alerts into incidents and exposes supported behaviors for hunting. Runtime events and DLP signals need not become incidents. Insider Risk alert sharing is separate and excludes Risky AI usage events.",
     "preview": false,
     "protects": [
      {
       "id": "copilot",
       "how": "Copilot jailbreak signals; Defender for Office 365 Plan 2 detects prompt injection in inbound email.",
       "kind": "observe"
      }
     ],
     "works": [
      {
       "id": "sentinel",
       "how": "Configured integration synchronizes supported incidents. Defender for Cloud alerts and entities need its Sentinel connector; raw hunting-data ingestion is separate."
      }
     ]
    },
    {
     "id": "sentinel",
     "title": "Microsoft Sentinel",
     "sub": "SIEM in the Defender portal",
     "desc": "The SIEM, running in the Defender portal alongside Defender XDR (the Azure portal experience retires after March 31, 2027). It brings in Entra ID and GSA logs, Purview labeling events, Defender for Cloud alerts, API Management and Azure OpenAI or Foundry logs, and Agent 365 agent telemetry (preview, to the data lake).",
     "preview": false,
     "protects": [],
     "works": []
    }
   ]
  }
 ],
 "take": "Configured traffic paths, enforcement policies, discovery and monitoring are different relationships. Security operations combines supported incidents, hunting behaviors and separately ingested logs—not every signal becomes an incident.",
 "scopeNote": "Illustrative configured routes, not automatic product routing or complete threat coverage. Source, identity, channel, policy mode, licensing and target cloud determine support. Commercial-cloud capability does not establish GCC or GCC High parity.",
 "sources": [
  {
   "label": "GSA traffic acquisition",
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding"
  },
  {
   "label": "Copilot Studio GSA scope",
   "href": "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-secure-web-ai-gateway-agents"
  },
  {
   "label": "Foundry MCP gateway limitations",
   "href": "https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/governance"
  },
  {
   "label": "API Management vs AI Gateway",
   "href": "https://learn.microsoft.com/en-us/azure/ai-gateway/compare-api-management-service"
  },
  {
   "label": "AI Gateway migration limitations",
   "href": "https://learn.microsoft.com/en-us/azure/ai-gateway/ai-gateway-resource"
  },
  {
   "label": "Agent 365 desktop discovery",
   "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"
  },
  {
   "label": "Connected-platform inventory scope",
   "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/connected-platforms"
  },
  {
   "label": "Agent registry visibility",
   "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-registry-overview"
  },
  {
   "label": "Runtime protection coverage",
   "href": "https://learn.microsoft.com/en-us/defender-xdr/security-for-ai/ai-agent-real-time-protection"
  },
  {
   "label": "DSPM capability ownership",
   "href": "https://learn.microsoft.com/en-us/purview/data-security-posture-management-learn-about"
  },
  {
   "label": "XDR and Sentinel integration limits",
   "href": "https://learn.microsoft.com/en-us/azure/sentinel/microsoft-365-defender-sentinel-integration"
  },
  {
   "label": "Studio identity and channel scope",
   "href": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/govern-agents-identities-overview"
  },
  {
   "label": "Studio Purview support",
   "href": "https://learn.microsoft.com/en-us/purview/ai-copilot-studio"
  },
  {
   "label": "Custom-agent Purview enforcement",
   "href": "https://learn.microsoft.com/en-us/purview/developer/secure-ai-with-purview"
  },
  {
   "label": "Restricted Content Discovery limits",
   "href": "https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery"
  },
  {
   "label": "Foundry Purview integration",
   "href": "https://learn.microsoft.com/en-us/azure/foundry/control-plane/how-to-manage-compliance-security"
  },
  {
   "label": "Agent 365 GCC feature availability",
   "href": "https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-agent-365/microsoft-agent-365"
  },
  {
   "label": "APIM A2A backend prerequisites",
   "href": "https://learn.microsoft.com/en-us/azure/api-management/agent-to-agent-api"
  },
  {
   "label": "Copilot agent entitlements",
   "href": "https://learn.microsoft.com/en-us/copilot/manage/manage-agents-copilot-chat"
  },
  {
   "label": "Foundry gateway configuration",
   "href": "https://learn.microsoft.com/en-us/azure/foundry/configuration/enable-ai-api-management-gateway-portal"
  },
  {
   "label": "Defender for AI Services scope",
   "href": "https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-threat-protection"
  },
  {
   "label": "Power Platform connector policy scope",
   "href": "https://learn.microsoft.com/en-us/power-platform/admin/advanced-connector-policies"
  },
  {
   "label": "SAM features included with Copilot",
   "href": "https://learn.microsoft.com/en-us/sharepoint/sharepoint-advanced-management-features-copilot-license"
  },
  {
   "label": "Agent 365 BYO MCP registration",
   "href": "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/manage-byo-mcp-server"
  },
  {
   "label": "Agent network controls GA announcement",
   "href": "https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/"
  }
 ]
};

export const DEFENSE = {
 "kicker": "Reference architecture · Customer conversation",
 "title": "Securing AI end to end on Microsoft",
 "sub": "Complementary Microsoft security domains for Copilot, agents, custom AI applications and supported everyday AI paths.",
 "status": "Reviewed against Microsoft documentation on November 4, 2026. Illustrative reference design, not verified tenant enforcement. Validate feature scope, licensing, preview status, target cloud and residual risks before deployment.",
 "principles": {
  "kicker": "Design principles",
  "title": "Six principles decide where every control sits",
  "sub": "Use these design requirements to place controls at supported boundaries; they are not claims of default enforcement.",
  "items": [
   {
    "title": "Treat the model as untrusted",
    "text": "Treat model output, retrieved content and tool responses as untrusted. Implement resource-side authorization and explicit approval for designated consequential actions; model text is not authorization."
   },
   {
    "title": "Enforce at the path, observe everywhere",
    "text": "Enforcement is distributed across configured identity, application, network, runtime, endpoint and data boundaries. Separate blockers, audit-only controls, discovery and SOC telemetry; name each supported path."
   },
   {
    "title": "Agents are identities",
    "text": "Use governed nonhuman identities where supported. Record owner/sponsor, actual tool principal, least privilege and lifecycle. Maker credentials can be used unless restricted; end-user-only requirements can break unattended agents."
   },
   {
    "title": "Fix the data estate before grounding on it",
    "text": "Copilot permission trimming does not repair oversharing. Correct source permissions and sharing links; configure encryption, DLP and discovery restrictions within their documented scopes."
   },
   {
    "title": "Plan for gaps and missed detections",
    "text": "Assume a control can miss an attack or not cover a path. Add independent safeguards, test enforcement and failure behavior, and retain monitoring plus residual-risk ownership without promising a catch."
   },
   {
    "title": "Prefer what the customer already runs",
    "text": "Reuse existing licensed services where appropriate. Additional entitlements, integrations, gateway routing, runtime enablement and application changes depend on the starting estate and use case."
   }
  ]
 },
 "layers": {
  "kicker": "Reference architecture",
  "title": "Seven complementary security domains",
  "sub": "These are overlapping enforcement and visibility domains, not seven serial hops that every prompt traverses.",
  "preview": "Status is feature-specific. Copilot Studio agent network controls are GA. Foundry agent guardrails, Studio/Foundry Defender runtime integrations and endpoint runtime protection include documented previews. Blocking requires supported configuration.",
  "items": [
   {
    "label": "Identity",
    "sub": "who or what is asking",
    "products": [
     {
      "title": "Entra ID + Conditional Access",
      "sub": "Configured token / sign-in decisions",
      "inline": true
     },
     {
      "title": "Entra Agent ID",
      "sub": "Supported nonhuman identities",
      "inline": false
     },
     {
      "title": "Entra ID Governance",
      "sub": "Configured access and sponsor lifecycle",
      "inline": false
     }
    ]
   },
   {
    "label": "Network",
    "sub": "where traffic may go",
    "products": [
     {
      "title": "Entra Internet Access",
      "sub": "Acquired supported network traffic",
      "inline": true
     },
     {
      "title": "APIM AI gateway",
      "sub": "Configured model / MCP / agent APIs",
      "inline": true
     },
     {
      "title": "Secure Web & AI GW",
      "sub": "Supported baseline-filtered egress · GA",
      "inline": true
     }
    ]
   },
   {
    "label": "Data",
    "sub": "what AI may read or emit",
    "products": [
     {
      "title": "Purview labels + DLP",
      "sub": "Configured content/source/destination scope",
      "inline": true
     },
     {
      "title": "Purview DSPM",
      "sub": "Data-risk insights and remediation",
      "inline": false
     },
     {
      "title": "Purview compliance solutions",
      "sub": "Audit, eDiscovery, IRM and review",
      "inline": false
     }
    ]
   },
   {
    "label": "Runtime",
    "sub": "model inputs and tool calls",
    "products": [
     {
      "title": "Foundry agent guardrails",
      "sub": "Configured intervention points · preview",
      "inline": true
     },
     {
      "title": "Prompt Shields",
      "sub": "Detection; supported blocking when enabled",
      "inline": true
     },
     {
      "title": "Foundry Control Plane",
      "sub": "Fleet oversight, evals and tracing",
      "inline": false
     }
    ]
   },
   {
    "label": "Agent plane",
    "sub": "fleet registry and policy",
    "products": [
     {
      "title": "Agent 365",
      "sub": "Supported inventory and governance",
      "inline": false
     },
     {
      "title": "Defender agent protection",
      "sub": "Platform-specific runtime rules · preview",
      "inline": true
     },
     {
      "title": "Power Platform policies",
      "sub": "Connectivity policies; auth settings separate",
      "inline": true
     }
    ]
   },
   {
    "label": "Endpoint",
    "sub": "the device and local AI",
    "products": [
     {
      "title": "Defender for Endpoint",
      "sub": "Discovery and runtime setup are distinct",
      "inline": true
     },
     {
      "title": "Endpoint DLP",
      "sub": "Supported classified-file/data activities",
      "inline": true
     },
     {
      "title": "Intune",
      "sub": "Device policy, compliance; OpenClaw block preview",
      "inline": true
     }
    ]
   },
   {
    "label": "SecOps",
    "sub": "supported incidents, logs and behaviors",
    "products": [
     {
      "title": "Defender XDR",
      "sub": "Eligible incidents and hunting behaviors",
      "inline": false
     },
     {
      "title": "Microsoft Sentinel",
      "sub": "Configured analytics / data-lake ingestion",
      "inline": false
     },
     {
      "title": "Security Copilot",
      "sub": "Optional licensed triage/hunting features",
      "inline": false
     }
    ]
   }
  ]
 },
 "paths": {
  "kicker": "Follow the interaction",
  "title": "AI paths with different control boundaries",
  "sub": "Choose the customer’s actual path, then validate platform-specific prerequisites and exceptions.",
  "items": [
   {
    "title": "Microsoft Copilot and Copilot Chat",
    "summary": "Configured Entra access, source permissions and supported Purview/SAM controls. Discovery restrictions do not revoke access; web queries have separate handling.",
    "tab": "arch",
    "view": "copilot",
    "link": "Open the Microsoft Copilot flow"
   },
   {
    "title": "Cloud and shadow AI",
    "summary": "Acquired GSA traffic, supported endpoint/browser DLP and app-governance integrations. Bypasses, unsupported payloads and unmanaged paths remain gaps.",
    "tab": "shadow",
    "view": "",
    "link": "Open the Shadow AI tab"
   },
   {
    "title": "Local AI and developer tools",
    "summary": "Separate supported endpoint discovery, Windows runtime preview, classified-file DLP and application control. Offline inference bypasses gateways, not necessarily existing endpoint policies.",
    "tab": "ref",
    "view": "",
    "link": "Open the Reference architecture"
   },
   {
    "title": "Copilot Studio agent",
    "summary": "Applicable identity and connector policies, supported GSA egress and connected Defender tool checks. Credential modes and publication channels change coverage.",
    "tab": "arch",
    "view": "studio",
    "link": "Open the Copilot Studio flow"
   },
   {
    "title": "Custom app or agent on Microsoft Foundry",
    "summary": "Configured model/eligible-MCP routing, agent-specific permissions and supported runtime/data integrations. Native tools and model-service alerts have separate scopes.",
    "tab": "arch",
    "view": "foundry",
    "link": "Open the Foundry flow"
   }
  ],
  "third": {
   "title": "Third-party agent platform (AWS, GCP, SaaS)",
   "cells": [
    [
     "Identity and API controls",
     "Use supported federation/sidecar or other approved authentication and explicit gateway routes where controllable. Platform-native authorization remains essential."
    ],
    [
     "Inventory and telemetry",
     "Supported Agent 365 platform synchronization is primarily read-only; observability varies. Retired Defender cloud-agent connectors are not a substitute."
    ],
    [
     "Known gap",
     "Registry synchronization does not retrofit runtime controls or reroute source-platform agents. Validate actual data/tool permissions and telemetry."
    ]
   ]
  }
 },
 "interaction": {
  "kicker": "One interaction",
  "title": "Illustrative checkpoints for an agent task",
  "sub": "An employee asks an agent to summarize a case and update a system. These are possible control points, not twelve universally executed checks.",
  "steps": [
   {
    "title": "Request",
    "sub": "authenticate the applicable principal",
    "checks": [
     [
      "Conditional Access",
      "Correct supported token subject and policy"
     ],
     [
      "Agent identity",
      "Owner, permissions and legacy state verified"
     ],
     [
      "Registry visibility",
      "Governance inventory—not a runtime gate"
     ]
    ]
   },
   {
    "title": "Retrieve",
    "sub": "authorize actual data access",
    "checks": [
     [
      "Source authorization",
      "User, agent or other configured tool identity"
     ],
     [
      "Labels / DLP",
      "Only supported selected-content rules"
     ],
     [
      "Document scanning",
      "Enable supported detection and blocking"
     ]
    ]
   },
   {
    "title": "Reason and call",
    "sub": "authorize a supported tool operation",
    "checks": [
     [
      "Runtime guardrails",
      "Applicable intervention points and action"
     ],
     [
      "Defender runtime rules",
      "Audit by default; custom blocks where supported"
     ],
     [
      "Network / API policy",
      "Only acquired or explicitly routed paths"
     ]
    ]
   },
   {
    "title": "Act",
    "sub": "enforce before irreversible effects",
    "checks": [
     [
      "Approval workflow",
      "Implement for designated high-impact actions"
     ],
     [
      "Data / destination policy",
      "Applicable channel or middleware checks"
     ],
     [
      "SOC evidence",
      "Configured logs, behaviors and eligible alerts"
     ]
    ]
   }
  ],
  "wrong": "A hidden instruction in the case file tells the agent to export the customer list and email it to an external address, using the agent's own permissions.",
  "caught": "Configured controls can intervene at supported boundaries: document scanning, runtime rules, resource authorization, applicable DLP and implemented approval workflows can reduce risk. They can miss attacks or exclude paths. Validate prevention and failure behavior; incident creation depends on detections, tuning and ingestion."
 },
 "matrix": {
  "kicker": "Threat-to-control matrix",
  "title": "Layered controls for selected AI risks",
  "sub": "Illustrative alignment with OWASP LLM Top 10 and MITRE ATLAS—not a validated, complete standards crosswalk. Record taxonomy versions, IDs, tests and residual risks separately.",
  "heads": [
   "Threat",
   "What it looks like",
   "Configured prevention",
   "Additional mitigation / response",
   "Evidence when enabled"
  ],
  "rows": [
   [
    "Direct prompt injection and jailbreak",
    "User tries to override system instructions",
    "Supported Prompt Shields blocking or application enforcement; routed JSON-text prompt policies with required TLS inspection.",
    "Configured Foundry/runtime checks at supported intervention points; test modes and coverage.",
    "Eligible model-service detections, runtime behaviors and configured SIEM ingestion."
   ],
   [
    "Indirect prompt injection via content",
    "Hidden instruction in a document, email, web page or tool response",
    "Explicitly enable supported document scanning. Office 365 Plan 2 detects inbound attacks as High confidence phishing.",
    "Configured tool authorization, supported runtime blocks and application approval gates; not automatic protection everywhere.",
    "Platform-specific detections/behaviors and instrumented agent activity; recording guidance has documented rollout conflicts."
   ],
   [
    "Sensitive data in prompts and outputs",
    "Employee pastes regulated data into Copilot, a SaaS AI app or an agent",
    "Separate Copilot-location, endpoint/browser and integrated network DLP. Configure selected-label exclusions and supported actions.",
    "Use applicable web/destination blocks. Insider Risk and Communication Compliance support investigation, not universal inline rejection.",
    "Supported Purview activity, audit and risk records; configure policies and billing as required."
   ],
   [
    "Oversharing amplification",
    "Copilot surfaces files the user technically can but should not see",
    "Correct source permissions and sharing links; configure encryption and DLP. RCD only reduces tenant-wide discovery.",
    "Access reviews, assessments and auto-labeling guide remediation; they do not automatically deny access.",
    "Permission assessments, completed owner reviews and supported content-access audit."
   ],
   [
    "Excessive agency and unsafe tool use",
    "Agent updates, deletes or sends something it should not",
    "Least privilege for the actual tool identity and downstream business authorization; configured tool confirmations and runtime rules.",
    "Implemented high-impact approval and routed API policies before backend effects.",
    "Instrumented tool activity and eligible runtime detections; distinguish behaviors from alerts."
   ],
   [
    "Agent identity abuse",
    "Stolen agent token, maker credentials exceeding user rights, orphaned agents",
    "Unique supported identities, secure federation/credentials and correctly targeted token policies; configure lifecycle accountability.",
    "Offline agent/user risk signals and applicable enforcement; credential-leak alerts do not detect every stolen agent token.",
    "Configured Entra sign-in/audit/risk export; verify any additional Sentinel connector and table support."
   ],
   [
    "Shadow AI apps and agents",
    "Unsanctioned SaaS AI, personal accounts, local agents nobody registered",
    "Configured app/network restrictions on supported managed paths; discovery, catalog tags and inventory do not block by themselves.",
    "Supported endpoint data controls and application control; app governance is OAuth-scoped.",
    "Observed SaaS/local/registry inventory and configured data-risk telemetry; document blind spots."
   ],
   [
    "Model and supply-chain compromise",
    "Backdoored model files, malicious MCP servers, poisoned connectors",
    "Review supported model-scan findings and enforce release gates. Govern routed MCP with identity and API policies.",
    "CSPM findings and MCP configuration discovery guide remediation; neither proves a safe model/server or stops every backdoor.",
    "Supported AI BOM, model findings, attack paths and investigation evidence with plan/platform limits."
   ],
   [
    "Data exfiltration through agent actions",
    "Agent emails, exports or posts sensitive data externally",
    "Enforce supported data/destination policies or integrated middleware before disclosure and irreversible tool side effects.",
    "Configured runtime checks and business approval. APIM outbound response policies cannot undo a completed send or export.",
    "Applicable data activity, agent telemetry and configured network/API logs."
   ],
   [
    "Resource abuse and denial of wallet",
    "Runaway token spend, abusive callers",
    "Supported per-key APIM token throttles; workload loop limits; separately configured spending controls.",
    "Foundry quotas are throughput controls, not budgets. Power Platform hard stops are optional, delayed and scoped; manage separate flow usage.",
    "Usage and billing monitoring plus eligible suspicious-source/wallet alerts—not automatic spend cessation."
   ],
   [
    "Insecure output handling",
    "Model output executed as code, command or HTML",
    "Application schema validation, context-aware encoding, parameterized queries and prohibition of untrusted direct execution.",
    "Least privilege, supported runtime checks and explicit approval; content classifiers are not sink-specific sanitizers.",
    "Instrumented application/device activity and supported Defender investigations."
   ]
  ]
 },
 "detection": {
  "kicker": "Detection and response",
  "title": "Coordinate supported AI signals in the SOC",
  "sub": "Separate logs, hunting behaviors, posture findings, alerts and incidents. Configure and validate the path from each source.",
  "sources": [
   [
    "Foundry guardrails",
    "Configured annotations, blocks and traces"
   ],
   [
    "Defender for AI Services",
    "Supported Azure model text-call detections"
   ],
   [
    "Agent 365 + Defender",
    "Supported inventory, runtime activity and posture"
   ],
   [
    "Purview",
    "Configured DLP, audit and data-risk records"
   ],
   [
    "Entra and Global Secure Access",
    "Applicable identity risk and acquired-traffic logs"
   ],
   [
    "Defender for Endpoint",
    "Separately configured local discovery/runtime events"
   ],
   [
    "Cloud Apps + Office 365",
    "Observed SaaS activity and inbound email detections"
   ]
  ],
  "hubs": [
   {
    "title": "Defender XDR",
    "items": [
     "Correlate eligible alerts into incidents; other activity can remain hunting behaviors.",
     "DLP tuning and platform runtime mode affect alert/incident presentation.",
     "Use supported agent/activity tables; Security Dashboard for AI is a governance view, not an ingestion pipeline.",
     "Automatic attack disruption applies to supported high-confidence incidents with its deployment prerequisites."
    ]
   },
   {
    "title": "Microsoft Sentinel",
    "items": [
     "Ingest configured source data into analytics and/or the data lake; these tiers are not interchangeable.",
     "Synchronize supported XDR incident fields; raw events and Defender for Cloud alerts/entities need their own integrations.",
     "Use retention, notebooks and scheduled KQL within applicable permissions, licensing and data coverage.",
     "Sentinel MCP and graph capabilities are supported; custom graphs, graph MCP tools and some Entity Analyzer integrations retain separate preview prerequisites."
    ]
   }
  ],
  "respond": [
   [
    "Entra",
    "restrict supported identities or access with applicable policies"
   ],
   [
    "Defender",
    "use configured supported runtime blocks or device containment"
   ],
   [
    "GSA / API gateway",
    "change policies on acquired or explicitly routed traffic"
   ],
   [
    "Purview",
    "apply supported workload/item remediation with required permissions; quarantine scopes differ"
   ]
  ]
 },
 "boundaries": {
  "kicker": "Coverage boundaries",
  "title": "Make coverage limits explicit",
  "sub": "Name each supported path, enforcement mode and owned exception before deployment.",
  "items": [
   {
    "title": "Gateways protect only routed traffic",
    "text": "Manage the devices, route the APIs, and treat unrouted paths as a named risk in the design."
   },
   {
    "title": "GSA protects explicitly acquired traffic",
    "text": "Supported clients, remote networks and enabled Studio forwarding acquire different traffic. Studio baseline enforcement excludes documented LLM, knowledge and custom-tool paths; unacquired cloud-to-cloud paths remain outside."
   },
   {
    "title": "The AI Gateway sees only calls routed through it",
    "text": "Any app or agent, including Copilot Studio, that calls models or MCP servers directly instead of through the gateway, and people browsing to AI apps."
   },
   {
    "title": "Offline local inference bypasses every network control",
    "text": "Offline inference bypasses network gateways, but supported cached Windows Endpoint DLP policies and application controls can still apply. Runtime inspection and platform support require separate validation."
   },
   {
    "title": "Local runtime coverage depends on method and mode",
    "text": "Supported Windows preview combinations use vendor event hooks or covered network inspection. Discovery support is separate. Protection defaults to disabled; Audit permits actions and Block requires supported configuration."
   },
   {
    "title": "Prompt inspection has payload and routing limits",
    "text": "GSA prompt inspection needs supported acquired traffic, TLS and configured JSON text extraction. It excludes files and truncates long prompts. Add separate supported runtime/data controls and implemented approvals."
   },
   {
    "title": "Detection is not authorization",
    "text": "Keep resource-side permissions and per-action business authorization independent of model output or threat scores. Conditional Access evaluates supported token flows, not every application action."
   },
   {
    "title": "Permission trimming does not repair oversharing",
    "text": "Correct permissions and sharing links. SAM reviews and DSPM findings guide remediation; RCD limits discovery without revoking access, and classification alone is not an access boundary."
   },
   {
    "title": "Registry synchronization does not retrofit runtime security",
    "text": "Choose approved identity and API patterns where supported. Federation/sidecar and explicit gateway routing are architecture choices, not universal vendor capabilities; connected-platform inventory does not add execution controls."
   },
   {
    "title": "Inspect each tool’s actual authentication mode",
    "text": "Maker credentials can exceed the user’s rights and are allowed by default. Restrict them where appropriate; requiring live end-user credentials can break autonomous agents. Tool confirmation is separately configured and off by default."
   },
   {
    "title": "Validate status and test the available action modes",
    "text": "Preview and rollout status is feature-specific. Pilot the supported audit, annotation or blocking mode; not every preview offers an audit switch. Record production dependencies and rollback plans."
   },
   {
    "title": "Verify government-cloud features individually",
    "text": "Agent 365 became purchasable for eligible GCC customers on October 1, 2026, with phased capabilities. The GCC feature table excludes multiple security controls. GCC High timing and final authorization must not be inferred."
   }
  ]
 }
} as const;

export const REF_DIAGRAM: { viewBox: string; frames: RefFrame[]; labels: RefLabel[]; nodes: RefNode[]; wires: RefWire[] } = {
 "viewBox": "0 0 1600 1020",
 "frames": [
  {
   "x": 20,
   "y": 20,
   "w": 1560,
   "h": 96,
   "label": "IDENTITY & ACCESS",
   "lx": 40,
   "ly": 60,
   "tone": "idn"
  },
  {
   "x": 20,
   "y": 140,
   "w": 260,
   "h": 530,
   "label": "PEOPLE & DEVICES",
   "lx": 36,
   "ly": 166,
   "tone": "zone"
  },
  {
   "x": 300,
   "y": 140,
   "w": 190,
   "h": 530,
   "label": "NETWORK EDGE",
   "lx": 312,
   "ly": 166,
   "tone": "zone"
  },
  {
   "x": 510,
   "y": 140,
   "w": 400,
   "h": 530,
   "label": "AI APPS & AGENTS",
   "lx": 526,
   "ly": 166,
   "tone": "zone"
  },
  {
   "x": 930,
   "y": 140,
   "w": 180,
   "h": 530,
   "label": "GATEWAYS",
   "lx": 946,
   "ly": 166,
   "tone": "zone"
  },
  {
   "x": 1130,
   "y": 140,
   "w": 450,
   "h": 530,
   "label": "MODELS, TOOLS & DATA",
   "lx": 1146,
   "ly": 166,
   "tone": "zone"
  },
  {
   "x": 20,
   "y": 690,
   "w": 1560,
   "h": 190,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tone": "band"
  },
  {
   "x": 20,
   "y": 900,
   "w": 1560,
   "h": 100,
   "label": "SECURITY OPERATIONS",
   "lx": 40,
   "ly": 956,
   "tone": "ops"
  }
 ],
 "labels": [
  {
   "x": 40,
   "y": 726,
   "t": "DATA SECURITY"
  },
  {
   "x": 570,
   "y": 726,
   "t": "THREAT PROTECTION"
  },
  {
   "x": 1090,
   "y": 726,
   "t": "GOVERNANCE & POSTURE"
  },
  {
   "x": 40,
   "y": 80,
   "t": "Configured sign-in, device and agent policies",
   "small": true
  }
 ],
 "nodes": [
  {
   "id": "entra",
   "ref": "entra",
   "x": 300,
   "y": 38,
   "w": 300,
   "h": 62,
   "title": "Entra ID & Conditional Access",
   "sub": "Sign-in · MFA · device checks",
   "kind": "idn",
   "align": "c"
  },
  {
   "id": "idp",
   "ref": "idp",
   "x": 620,
   "y": 38,
   "w": 300,
   "h": 62,
   "title": "Entra ID Protection",
   "sub": "User, sign-in & agent risk",
   "kind": "idn",
   "align": "c"
  },
  {
   "id": "agentid",
   "ref": "agentid",
   "x": 940,
   "y": 38,
   "w": 300,
   "h": 62,
   "title": "Entra Agent ID",
   "sub": "An identity for every agent",
   "kind": "idn",
   "align": "c"
  },
  {
   "id": "intune",
   "ref": "intune",
   "x": 1260,
   "y": 38,
   "w": 300,
   "h": 62,
   "title": "Intune",
   "sub": "Device policies & compliance",
   "kind": "idn",
   "align": "c"
  },
  {
   "id": "employees",
   "ref": "employees",
   "x": 36,
   "y": 186,
   "w": 228,
   "h": 56,
   "title": "Employees",
   "sub": "Managed devices · browsers",
   "kind": "",
   "align": "l"
  },
  {
   "id": "local",
   "ref": "local",
   "x": 36,
   "y": 256,
   "w": 228,
   "h": 56,
   "title": "Local & custom agents",
   "sub": "CLI and coding agents",
   "kind": "",
   "align": "l"
  },
  {
   "id": "builders",
   "ref": "builders",
   "x": 36,
   "y": 478,
   "w": 228,
   "h": 56,
   "title": "Makers & developers",
   "sub": "Copilot Studio · Foundry · code",
   "kind": "",
   "align": "l"
  },
  {
   "id": "partners",
   "ref": "partners",
   "x": 36,
   "y": 590,
   "w": 228,
   "h": 56,
   "title": "Partners & external agents",
   "sub": "Guests · agent-to-agent callers",
   "kind": "",
   "align": "l"
  },
  {
   "id": "gsa",
   "ref": "gsa",
   "x": 310,
   "y": 186,
   "w": 170,
   "h": 354,
   "title": "Global Secure Access",
   "sub": "Internet + M365 traffic|Shadow AI discovery|Web filtering|Prompt injection|Purview DLP scan|MCP firewall (preview)",
   "kind": "gw",
   "align": "c"
  },
  {
   "id": "copilot",
   "ref": "copilot",
   "x": 526,
   "y": 186,
   "w": 368,
   "h": 52,
   "title": "Microsoft Copilot",
   "sub": "Formerly Microsoft 365 Copilot",
   "kind": "",
   "align": "l"
  },
  {
   "id": "thirdparty",
   "ref": "thirdparty",
   "x": 526,
   "y": 250,
   "w": 368,
   "h": 52,
   "title": "Third-party AI",
   "sub": "Claude · ChatGPT Enterprise",
   "kind": "tp",
   "align": "l"
  },
  {
   "id": "shadowai",
   "ref": "shadowai",
   "x": 526,
   "y": 314,
   "w": 368,
   "h": 52,
   "title": "Shadow AI apps",
   "sub": "Web · desktop · personal accounts",
   "kind": "shadow",
   "align": "l"
  },
  {
   "id": "ppac",
   "ref": "ppac",
   "x": 526,
   "y": 392,
   "w": 368,
   "h": 40,
   "title": "Power Platform data policies",
   "sub": "",
   "kind": "ctl",
   "align": "l"
  },
  {
   "id": "studio",
   "ref": "studio",
   "x": 526,
   "y": 446,
   "w": 368,
   "h": 56,
   "title": "Copilot Studio agents",
   "sub": "Tools: MCP, connectors, HTTP",
   "kind": "",
   "align": "l"
  },
  {
   "id": "foundry",
   "ref": "foundry",
   "x": 526,
   "y": 560,
   "w": 368,
   "h": 70,
   "title": "Foundry agents & custom AI apps",
   "sub": "Guardrails (Content Safety)|Tools: OpenAPI, Code Interpreter, MCP",
   "kind": "",
   "align": "l"
  },
  {
   "id": "swaig",
   "ref": "gsaagents",
   "x": 946,
   "y": 446,
   "w": 148,
   "h": 56,
   "title": "Secure Web & AI GW",
   "sub": "Secure Web &|AI Gateway",
   "kind": "gw",
   "align": "c"
  },
  {
   "id": "aigw",
   "ref": "aigw",
   "x": 946,
   "y": 545,
   "w": 148,
   "h": 100,
   "title": "APIM AI gateway",
   "sub": "Configured paths|Model policies|Eligible MCP tools",
   "kind": "gw",
   "align": "c"
  },
  {
   "id": "m365data",
   "ref": "m365data",
   "x": 1146,
   "y": 186,
   "w": 418,
   "h": 64,
   "title": "Microsoft 365 data",
   "sub": "SharePoint · OneDrive · Exchange · Teams",
   "kind": "",
   "align": "l"
  },
  {
   "id": "mcp",
   "ref": "mcp",
   "x": 1146,
   "y": 380,
   "w": 418,
   "h": 52,
   "title": "MCP servers & tools",
   "sub": "Microsoft and custom servers",
   "kind": "",
   "align": "l"
  },
  {
   "id": "connectors",
   "ref": "connectors",
   "x": 1146,
   "y": 446,
   "w": 418,
   "h": 52,
   "title": "Connectors & APIs",
   "sub": "Custom connectors · REST · OpenAPI",
   "kind": "",
   "align": "l"
  },
  {
   "id": "models",
   "ref": "models",
   "x": 1146,
   "y": 560,
   "w": 418,
   "h": 56,
   "title": "AI models",
   "sub": "Foundry · Anthropic · others",
   "kind": "",
   "align": "l"
  },
  {
   "id": "purview",
   "ref": "purview",
   "x": 40,
   "y": 740,
   "w": 235,
   "h": 56,
   "title": "Purview labels & DLP",
   "sub": "Labels · DLP · Endpoint DLP",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "dspm",
   "ref": "dspm",
   "x": 285,
   "y": 740,
   "w": 235,
   "h": 56,
   "title": "Purview DSPM",
   "sub": "Data posture · AI observability",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "sam",
   "ref": "sam",
   "x": 40,
   "y": 806,
   "w": 480,
   "h": 56,
   "title": "SharePoint Advanced Management",
   "sub": "Oversharing cleanup for Copilot",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "mde",
   "ref": "mde",
   "x": 570,
   "y": 740,
   "w": 235,
   "h": 56,
   "title": "Defender for Endpoint",
   "sub": "Device threats · app blocks",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "mdca",
   "ref": "mdca",
   "x": 815,
   "y": 740,
   "w": 235,
   "h": 56,
   "title": "Defender for Cloud Apps",
   "sub": "AI app catalog · discovery",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "mdai",
   "ref": "mdai",
   "x": 570,
   "y": 806,
   "w": 235,
   "h": 56,
   "title": "Defender for AI Services",
   "sub": "AI threat protection",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "rtap",
   "ref": "rtap",
   "x": 815,
   "y": 806,
   "w": 235,
   "h": 56,
   "title": "Defender agent protection",
   "sub": "Runtime checks (preview)",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "a365",
   "ref": "a365",
   "x": 1090,
   "y": 740,
   "w": 235,
   "h": 56,
   "title": "Agent 365",
   "sub": "Agent registry · control plane",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "aispm",
   "ref": "aispm",
   "x": 1335,
   "y": 740,
   "w": 225,
   "h": 56,
   "title": "AI security posture",
   "sub": "Defender CSPM",
   "kind": "band",
   "align": "c"
  },
  {
   "id": "xdr",
   "ref": "xdr",
   "x": 380,
   "y": 920,
   "w": 340,
   "h": 64,
   "title": "Defender XDR",
   "sub": "One incident queue",
   "kind": "ops",
   "align": "c"
  },
  {
   "id": "sentinel",
   "ref": "sentinel",
   "x": 880,
   "y": 920,
   "w": 340,
   "h": 64,
   "title": "Microsoft Sentinel",
   "sub": "SIEM in the Defender portal",
   "kind": "ops",
   "align": "c"
  }
 ],
 "wires": [
  {
   "pts": [
    [
     264,
     214
    ],
    [
     310,
     214
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "employees",
    "gsa"
   ]
  },
  {
   "pts": [
    [
     264,
     284
    ],
    [
     310,
     284
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "local",
    "gsa"
   ]
  },
  {
   "pts": [
    [
     480,
     212
    ],
    [
     526,
     212
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsa",
    "copilot",
    "employees"
   ]
  },
  {
   "pts": [
    [
     480,
     276
    ],
    [
     526,
     276
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsa",
    "thirdparty",
    "employees"
   ]
  },
  {
   "pts": [
    [
     480,
     340
    ],
    [
     526,
     340
    ]
   ],
   "style": "shadow",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsa",
    "shadowai",
    "employees"
   ]
  },
  {
   "pts": [
    [
     894,
     212
    ],
    [
     1146,
     212
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "Graph · user’s access",
   "lx": 1010,
   "ly": 204,
   "tags": [
    "copilot",
    "m365data"
   ]
  },
  {
   "pts": [
    [
     894,
     276
    ],
    [
     1115,
     276
    ],
    [
     1115,
     236
    ],
    [
     1146,
     236
    ]
   ],
   "style": "direct",
   "arrow": true,
   "label": "M365 connector (hosted)",
   "lx": 985,
   "ly": 270,
   "tags": [
    "thirdparty",
    "m365data"
   ]
  },
  {
   "pts": [
    [
     480,
     384
    ],
    [
     1120,
     384
    ],
    [
     1120,
     394
    ],
    [
     1146,
     394
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "Remote MCP traffic (MCP firewall, preview)",
   "lx": 700,
   "ly": 379,
   "tags": [
    "gsa",
    "mcp",
    "local",
    "employees"
   ]
  },
  {
   "pts": [
    [
     264,
     506
    ],
    [
     310,
     506
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "builders",
    "gsa"
   ]
  },
  {
   "pts": [
    [
     480,
     474
    ],
    [
     526,
     474
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "build",
   "lx": 502,
   "ly": 468,
   "tags": [
    "gsa",
    "studio",
    "builders"
   ]
  },
  {
   "pts": [
    [
     710,
     432
    ],
    [
     710,
     444
    ]
   ],
   "style": "governs",
   "arrow": true,
   "label": "governs",
   "lx": 742,
   "ly": 442,
   "tags": [
    "ppac",
    "studio"
   ]
  },
  {
   "pts": [
    [
     480,
     520
    ],
    [
     504,
     520
    ],
    [
     504,
     595
    ],
    [
     526,
     595
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsa",
    "foundry",
    "builders",
    "employees"
   ]
  },
  {
   "pts": [
    [
     894,
     474
    ],
    [
     946,
     474
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "studio",
    "gsaagents"
   ]
  },
  {
   "pts": [
    [
     1094,
     460
    ],
    [
     1112,
     460
    ],
    [
     1112,
     410
    ],
    [
     1146,
     410
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsaagents",
    "mcp",
    "studio"
   ]
  },
  {
   "pts": [
    [
     1094,
     478
    ],
    [
     1146,
     478
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "gsaagents",
    "connectors",
    "studio"
   ]
  },
  {
   "pts": [
    [
     894,
     595
    ],
    [
     946,
     595
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "foundry",
    "aigw"
   ]
  },
  {
   "pts": [
    [
     1094,
     588
    ],
    [
     1146,
     588
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "aigw",
    "models",
    "foundry"
   ]
  },
  {
   "pts": [
    [
     1094,
     562
    ],
    [
     1132,
     562
    ],
    [
     1132,
     424
    ],
    [
     1146,
     424
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "aigw",
    "mcp",
    "foundry"
   ]
  },
  {
   "pts": [
    [
     946,
     622
    ],
    [
     894,
     622
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": [
    "aigw",
    "foundry",
    "partners"
   ]
  },
  {
   "pts": [
    [
     880,
     502
    ],
    [
     880,
     524
    ],
    [
     1140,
     524
    ],
    [
     1140,
     574
    ],
    [
     1146,
     574
    ]
   ],
   "style": "direct",
   "arrow": true,
   "label": "Microsoft-managed models",
   "lx": 1010,
   "ly": 519,
   "tags": [
    "studio",
    "models"
   ]
  },
  {
   "pts": [
    [
     264,
     618
    ],
    [
     500,
     618
    ],
    [
     500,
     656
    ],
    [
     1020,
     656
    ],
    [
     1020,
     645
    ]
   ],
   "style": "solid",
   "arrow": true,
   "label": "A2A agent API (JSON-RPC)",
   "lx": 760,
   "ly": 651,
   "tags": [
    "partners",
    "aigw"
   ]
  },
  {
   "pts": [
    [
     150,
     102
    ],
    [
     150,
     138
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     395,
     102
    ],
    [
     395,
     138
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     710,
     102
    ],
    [
     710,
     138
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     1020,
     102
    ],
    [
     1020,
     138
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     270,
     690
    ],
    [
     270,
     672
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     800,
     690
    ],
    [
     800,
     672
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     1330,
     690
    ],
    [
     1330,
     672
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     550,
     880
    ],
    [
     550,
     918
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "eligible alerts / behaviors",
   "lx": 560,
   "ly": 903,
   "tags": []
  },
  {
   "pts": [
    [
     720,
     952
    ],
    [
     880,
     952
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "two-way incident sync",
   "lx": 800,
   "ly": 944,
   "tags": []
  },
  {
   "pts": [
    [
     880,
     952
    ],
    [
     720,
     952
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "",
   "lx": 0,
   "ly": 0,
   "tags": []
  },
  {
   "pts": [
    [
     1050,
     880
    ],
    [
     1050,
     918
    ]
   ],
   "style": "plane",
   "arrow": true,
   "label": "configured log ingestion",
   "lx": 1060,
   "ly": 903,
   "tags": []
  }
 ]
};
