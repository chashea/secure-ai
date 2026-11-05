import { useResolvedTheme, type ResolvedTheme } from "@/lib/theme";

/** Diagram canvas colors per theme. Dark keeps the original blueprint look. */
const DARK = {
  canvas: "#0A1628",
  frame: "#0E2036", frameStroke: "#35506F",
  opsFrame: "#0E2A2A", opsFrameStroke: "#356F69",
  frameLabel: "#CFDBEA", sectionLabel: "#9BE2D7",
  wireLabel: "#C5D9F0", nodeTitle: "#F2F6FB", nodeSub: "#BDCEE3",
  dimFill: "#102137", selected: "#FFFFFF", onPath: "#C5DFEF", flowOnPath: "#91DDD2",
  selectedName: "White",
  focusRing: "focus-visible:ring-white",
  nodes: {
    gw: { fill: "#0C3940", border: "#2EC4B6" },
    shadow: { fill: "#302115", border: "#FF8A3D" },
    tp: { fill: "#251E3D", border: "#AA8CDB" },
    ctl: { fill: "#172D49", border: "#7299C7" },
    idn: { fill: "#142C49", border: "#6387B3" },
    band: { fill: "#12303C", border: "#4A8C98" },
    ops: { fill: "#0D3633", border: "#42C4B5" },
    "": { fill: "#142A47", border: "#6387B3" },
  } as Record<string, { fill: string; border: string }>,
  flow: {
    policyBand: "#111F35", policyStroke: "#2B3E5A", policyLabel: "#B7C8DE",
    runtimeBand: "#0D1D33", runtimeStroke: "#233D60", columnLabel: "#A9C2DF",
    controlBand: "#10272D", controlStroke: "#285B5C", controlLabel: "#9DE1D8",
    edgeLabel: "#B8D2ED",
    nodes: {
      actor: { background: "#132440", borderColor: "#5C7BA7" },
      service: { background: "#153A45", borderColor: "#2EC4B6" },
      gateway: { background: "#0E3339", borderColor: "#2EC4B6" },
      resource: { background: "#132440", borderColor: "#5C7BA7" },
      control: { background: "#1B2540", borderColor: "#647696" },
    } as Record<string, { background: string; borderColor: string }>,
  },
};

const LIGHT: typeof DARK = {
  canvas: "#F4F7FB",
  frame: "#FFFFFF", frameStroke: "#B8C7DA",
  opsFrame: "#EEF7F6", opsFrameStroke: "#9CCBC6",
  frameLabel: "#33475F", sectionLabel: "#1F6F68",
  wireLabel: "#2C4566", nodeTitle: "#0F1F33", nodeSub: "#3E5571",
  dimFill: "#EEF1F5", selected: "#0A1628", onPath: "#2E5F8F", flowOnPath: "#138377",
  selectedName: "Navy",
  focusRing: "focus-visible:ring-slate-900",
  nodes: {
    gw: { fill: "#E3F6F4", border: "#138377" },
    shadow: { fill: "#FFF1E6", border: "#C2560F" },
    tp: { fill: "#F1ECFB", border: "#7A5BB8" },
    ctl: { fill: "#E8EFF8", border: "#4C6F9C" },
    idn: { fill: "#E8EFF8", border: "#4C6F9C" },
    band: { fill: "#E6F2F4", border: "#3C7C88" },
    ops: { fill: "#E3F4F2", border: "#1F8A7E" },
    "": { fill: "#EDF2F8", border: "#5A7BA5" },
  },
  flow: {
    policyBand: "#FFFFFF", policyStroke: "#C3CFDE", policyLabel: "#3A5170",
    runtimeBand: "#EEF3F9", runtimeStroke: "#BFCDE0", columnLabel: "#3A5677",
    controlBand: "#EAF5F3", controlStroke: "#9CCBC6", controlLabel: "#1F6F68",
    edgeLabel: "#2C4566",
    nodes: {
      actor: { background: "#FFFFFF", borderColor: "#5A7BA5" },
      service: { background: "#E3F6F4", borderColor: "#138377" },
      gateway: { background: "#D9F1EE", borderColor: "#138377" },
      resource: { background: "#FFFFFF", borderColor: "#5A7BA5" },
      control: { background: "#EEF1F8", borderColor: "#6A7A99" },
    },
  },
};

/** Line/legend colors are authored for the dark canvas; these keep ≥3:1 on light surfaces. */
const LIGHT_LINE: Record<string, string> = {
  "#5B7FAD": "#3F6596",
  "#9FC6EA": "#4F86BD",
  "#FF8A3D": "#C2560F",
  "#B48CFF": "#7A4FD6",
  "#519B95": "#2F7A74",
  "#2EC4B6": "#138377",
  "#FFC857": "#A86B00",
};

export type DiagramPalette = typeof DARK & { line: (color: string) => string };

export function diagramPalette(theme: ResolvedTheme): DiagramPalette {
  const base = theme === "dark" ? DARK : LIGHT;
  const line = (c: string) => (theme === "dark" ? c : LIGHT_LINE[c.toUpperCase()] ?? c);
  return { ...base, line };
}

export function useDiagramPalette(): DiagramPalette {
  return diagramPalette(useResolvedTheme());
}
