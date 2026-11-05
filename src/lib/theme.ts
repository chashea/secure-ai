import { useEffect, useLayoutEffect } from "react";
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "securing-ai-agents:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStored(): ThemeMode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* storage unavailable — fall back to system */ }
  return "system";
}
function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

interface ThemeState {
  mode: ThemeMode;
  system: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  setSystem: (t: ResolvedTheme) => void;
}

const useThemeStore = create<ThemeState>((set) => ({
  mode: readStored(),
  system: systemTheme(),
  setMode: (mode) => {
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch { /* preference lasts for this session only */ }
    set({ mode });
  },
  setSystem: (system) => set({ system }),
}));

export function useThemeMode() {
  return useThemeStore((s) => s.mode);
}
export function useSetThemeMode() {
  return useThemeStore((s) => s.setMode);
}
export function useResolvedTheme(): ResolvedTheme {
  return useThemeStore((s) => (s.mode === "system" ? s.system : s.mode));
}

/** Mount once (in the app shell): follows OS changes and applies the theme class to <html>. */
export function useThemeSync() {
  const resolved = useResolvedTheme();
  const setSystem = useThemeStore((s) => s.setSystem);

  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setSystem]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("light", resolved === "light");
    root.style.colorScheme = resolved;
  }, [resolved]);

  return resolved;
}
