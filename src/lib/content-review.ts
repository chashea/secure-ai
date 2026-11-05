export type ReviewTab = "reference" | "flows" | "defense" | "gateways" | "shadow" | "rollout";
export const REVIEW_DATE = "November 4, 2026";
export const GATEWAY_ROUTES = [
  { title: "Device or supported branch traffic", path: ["User / device / branch", "Configured GSA forwarding", "Acquired destination"], scope: "Profiles, assignment, bypasses, client platform and inspection policy determine coverage." },
  { title: "Copilot Studio agent egress", path: ["Studio agent", "Secure Web & AI GW", "Supported tool destination"], scope: "Enabled environment/group integration and baseline policies; Microsoft-managed models and documented excluded paths remain separate." },
  { title: "Configured model and tool APIs", path: ["Foundry / custom application", "API Management endpoint", "Supported model / MCP / A2A backend"], scope: "Explicit gateway routes and policies, with backend access restrictions where supported. This is not automatic routing of every tool." },
];
const source = (label: string, href: string) => ({ label, href });
export const TAB_REVIEWS: Record<ReviewTab, { limits: string[]; sources: { label: string; href: string }[] }> = {
  reference: {
    limits: [
      "Intune is a device-policy control, not a traffic hop. Shadow AI (Frontier) execution blocking is currently OpenClaw-only on Intune-enrolled Windows; discovery is broader than blocking.",
      "This logical design separates configured traffic, policy, enforcement and discovery. It is not evidence that a customer tenant has the licenses, integrations or blocking rules enabled.",
      "Studio identity/registry lifecycle guidance and Foundry Purview billing guidance differ across Microsoft pages. Verify the expected records, channel enforcement and current integration entitlement.",
      "The dedicated AI Gateway preview resource is distinct from APIM. Do not assume replacement-resource parity for individual-tool governance.",
    ],
    sources: [
      source("Shadow AI in Microsoft 365 admin center (Preview)", "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"),
      source("Install the Global Secure Access client for Windows", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-install-windows-client"),
      source("Configure Microsoft Defender for Endpoint with Intune and onboard devices", "https://learn.microsoft.com/en-us/intune/device-security/microsoft-defender/configure-integration"),
      source("Configure network protection in Microsoft Defender Antivirus", "https://learn.microsoft.com/en-us/defender-endpoint/enable-network-protection"),
      source("Get started with the Microsoft Purview extension for Chrome", "https://learn.microsoft.com/en-us/purview/dlp-chrome-get-started"),
      source("Get started with the Microsoft Purview extension for Firefox", "https://learn.microsoft.com/en-us/purview/dlp-firefox-extension-get-started"),
      source("Require device compliance with Conditional Access", "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance"),
      source("Studio identity and channel scope", "https://learn.microsoft.com/en-us/microsoft-copilot-studio/govern-agents-identities-overview"),
      source("Registry lifecycle", "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-registry-overview"),
      source("Restricted Content Discovery", "https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery"),
      source("Foundry Purview integration", "https://learn.microsoft.com/en-us/azure/foundry/control-plane/how-to-manage-compliance-security"),
    ],
  },
  flows: {
    limits: [
      "The workload flows and control table map to the shared reference architecture. An item shown as a shared control is not an extra runtime hop; a different-scope item is not a universal protection claim.",
      "GSA device acquisition, Studio agent egress, configured APIM calls and local stdio/inference are separate paths. Discovery, data-risk insights, endpoint execution controls and incident/log ingestion retain their own prerequisites.",
      "Each path is an example requiring the configured endpoint, actual tool principal and supported platform. Work-data agents are a subset of approved agents; public-data agents need not access tenant data.",
      "Purview protection, label behavior and endpoint controls are not automatically inherited by every model/tool call. Check the selected integration, user context, knowledge source and publication channel.",
      "Inbound A2A requires an existing compatible JSON-RPC backend/adapter imported into APIM. Registry approval is not automatic source-platform runtime enforcement.",
    ],
    sources: [
      source("Studio Purview support", "https://learn.microsoft.com/en-us/purview/ai-copilot-studio"),
      source("Custom-agent DLP integration", "https://learn.microsoft.com/en-us/purview/developer/secure-ai-with-purview"),
      source("A2A import prerequisites", "https://learn.microsoft.com/en-us/azure/api-management/agent-to-agent-api"),
      source("Copilot agent entitlements", "https://learn.microsoft.com/en-us/copilot/manage/manage-agents-copilot-chat"),
    ],
  },
  defense: {
    limits: [
      "Intune deploys device controls and supplies compliance. Desktop Shadow AI blocking has its own supported-agent matrix and Windows enrollment requirements; it is not blanket AI-app prevention.",
      "Security domains are complementary, not serial per-prompt gates. Inventory, risk scoring, detection and content classification do not by themselves establish runtime authorization or blocking.",
      "Cloud runtime rules default to audit; local runtime protection is separately enabled and has method/platform limits. Implement action authorization and high-impact approval before irreversible side effects.",
      "Microsoft pages differ on some Studio block-event reporting. Validate the actual alert/behavior records produced in the target tenant rather than promising identical evidence for every platform.",
      "Threat categories are illustrative, not a validated OWASP/ATLAS coverage certification. Model-scan findings, review workflows and quotas require distinct remediation, enforcement and spending controls.",
      "Agent network controls are GA; runtime and other preview qualifications are feature-specific. Agent 365 GCC purchasing does not establish security feature parity or GCC High rollout timing.",
    ],
    sources: [
      source("Shadow AI in Microsoft 365 admin center (Preview)", "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"),
      source("Configure Microsoft Defender for Endpoint with Intune and onboard devices", "https://learn.microsoft.com/en-us/intune/device-security/microsoft-defender/configure-integration"),
      source("Configure network protection in Microsoft Defender Antivirus", "https://learn.microsoft.com/en-us/defender-endpoint/enable-network-protection"),
      source("Distributed agent security", "https://learn.microsoft.com/en-us/security/security-for-ai/agent-365-security"),
      source("Runtime audit and blocking", "https://learn.microsoft.com/en-us/defender-xdr/security-for-ai/ai-agent-real-time-protection"),
      source("Maker credential settings", "https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-no-maker-authentication"),
      source("Application approval and authorization", "https://learn.microsoft.com/en-us/security/zero-trust/catalog-ai-defense-capabilities/identity-access-least-privilege"),
      source("Agent DLP scope", "https://learn.microsoft.com/en-us/purview/ai-agent-365"),
      source("APIM request / response policy stages", "https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-policies"),
      source("Foundry quota limitations", "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/quotas-limits"),
      source("Endpoint runtime support matrix", "https://learn.microsoft.com/en-us/defender-endpoint/ai-agent-support-matrix"),
      source("DLP signals in Defender", "https://learn.microsoft.com/en-us/defender-xdr/dlp-investigate-alerts-defender"),
      source("GCC feature availability", "https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-agent-365/microsoft-agent-365"),
      source("Agent network controls GA announcement", "https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/"),
    ],
  },
  gateways: {
    limits: [
      "These are separate routes, not one mandatory User → GSA → agent → APIM sequence. Select network/API controls based on the acquired destinations and endpoints under your control.",
      "Scan with Purview needs matching policies, supported Entra user context and payloads. Its size, encoding and error limitations include skipped inspections and fail-open cases.",
      "APIM tiers, Foundry integration and the dedicated AI Gateway preview resource have different capabilities. New-resource individual-tool support remains subject to current product confirmation.",
      "Remote-network support wording differs across older conceptual/licensing and newer configuration pages. Validate branch entitlement and each required security capability in the target tenant.",
    ],
    sources: [
      source("Traffic acquisition and profiles", "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding"),
      source("Remote-network baseline policy", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-apply-security-policies-remote-network"),
      source("Studio forwarding exclusions", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-secure-web-ai-gateway-agents"),
      source("Scan with Purview limitations", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-network-content-filtering"),
      source("APIM vs AI Gateway", "https://learn.microsoft.com/en-us/azure/ai-gateway/compare-api-management-service"),
      source("Gateway migration limitations", "https://learn.microsoft.com/en-us/azure/ai-gateway/ai-gateway-resource"),
      source("Agent 365 gateway capability table", "https://learn.microsoft.com/en-us/azure/api-management/agent-365"),
    ],
  },
  shadow: {
    limits: [
      "The current Frontier support matrix lists OpenClaw for blocking. ChatGPT Desktop, Claude Desktop and other detected agents are not automatically blocked by that workflow.",
      "Catalog-based SaaS discovery, supported desktop discovery, registry inventory and remote-MCP logs cover different assets. None establishes complete visibility of every web session, extension or local server.",
      "Unsanctioned tags require configured enforcement. Tenant restrictions apply to supported Microsoft-authenticated accounts, not native personal vendor accounts; DLP covers supported data actions, not all agent tools.",
      "Desktop Shadow AI and remote MCP inspection include previews and distinct prerequisites. Advanced connector policies block whole supported MCP servers, not individual tools.",
    ],
    sources: [
      source("Install the Global Secure Access client for Windows", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-install-windows-client"),
      source("Get started with the Microsoft Purview extension for Chrome", "https://learn.microsoft.com/en-us/purview/dlp-chrome-get-started"),
      source("Get started with the Microsoft Purview extension for Firefox", "https://learn.microsoft.com/en-us/purview/dlp-firefox-extension-get-started"),
      source("SaaS shadow AI discovery", "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-shadow-ai-discovery"),
      source("Desktop Shadow AI preview", "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-shadow-ai"),
      source("Discovery tags and enforcement", "https://learn.microsoft.com/en-us/defender-cloud-apps/governance-discovery"),
      source("Remote MCP firewall scope", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-mcp-firewall"),
      source("Advanced connector policies", "https://learn.microsoft.com/en-us/power-platform/admin/advanced-connector-policies"),
      source("Tenant restrictions v2 scope", "https://learn.microsoft.com/en-us/entra/external-id/tenant-restrictions-v2"),
    ],
  },
  rollout: {
    limits: [
      "Success criteria are scoped acceptance tests, not zero-leakage or complete-discovery guarantees. Preserve containment of known high-risk activity while visibility is expanded.",
      "Record supported and excluded paths, owners, modes, inspection failures, telemetry, exception handling and rollback. Verify commercial/government availability and current entitlement per feature.",
      "Documentation conflicts around registry lifecycle, Foundry billing and replacement-gateway tool controls must remain deployment checks rather than assumed capability.",
    ],
    sources: [
      source("Scoped rollout and measurable pilots", "https://learn.microsoft.com/en-us/entra/architecture/gsa-deployment-guide-intro"),
      source("Inspection and fail-open limits", "https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-network-content-filtering"),
      source("Foundry MCP routing eligibility", "https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/governance"),
      source("Connected-platform inventory limitations", "https://learn.microsoft.com/en-us/microsoft-agent-365/admin/connected-platforms"),
      source("Government-cloud feature table", "https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-agent-365/microsoft-agent-365"),
    ],
  },
};
