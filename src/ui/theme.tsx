import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { safeStorage } from "@/lib/storage";

/** Режим теми: світла, темна або як у системі телефона. */
export type ThemeMode = "light" | "dark" | "system";

const KEY = "theme";
const CANVAS = { light: "#f0f1f4", dark: "#0e0f11" } as const;

const systemDark = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;

const readMode = (): ThemeMode => {
  const saved = safeStorage.getItem(KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
};

/** Застосовує тему до <html> і кольору статус-бару. Той самий код дублює index.html (без мерехтіння). */
const apply = (dark: boolean) => {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", dark ? CANVAS.dark : CANVAS.light));
};

interface ThemeCtx { mode: ThemeMode; dark: boolean; setMode: (mode: ThemeMode) => void }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [osDark, setOsDark] = useState(systemDark);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setOsDark(media.matches);
    media.addEventListener?.("change", change);
    return () => media.removeEventListener?.("change", change);
  }, []);

  const dark = mode === "dark" || (mode === "system" && osDark);
  useEffect(() => { apply(dark); }, [dark]);

  const setMode = useCallback((next: ThemeMode) => {
    safeStorage.setItem(KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, dark, setMode }), [mode, dark, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
