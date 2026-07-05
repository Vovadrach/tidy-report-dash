import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { dict, MONTHS, WEEKDAYS, LOCALE, type Lang } from "./dict";

interface I18n {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  months: string[];
  weekdays: string[];
}

const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "uk" || saved === "it") return saved;
    return typeof navigator !== "undefined" && navigator.language.startsWith("it") ? "it" : "uk";
  });

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let s = dict[lang][key] ?? dict.uk[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  const value = useMemo<I18n>(
    () => ({ lang, locale: LOCALE[lang], setLang, t, months: MONTHS[lang], weekdays: WEEKDAYS[lang] }),
    [lang, setLang, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within LanguageProvider");
  return c;
};

export type { Lang };
