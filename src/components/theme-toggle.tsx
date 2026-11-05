import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetThemeMode, useThemeMode, type ThemeMode } from "@/lib/theme";

const OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const mode = useThemeMode();
  const setMode = useSetThemeMode();
  return (
    <div role="group" aria-label="Color theme" className="inline-flex shrink-0 rounded-lg border bg-muted p-0.5">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => setMode(id)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
