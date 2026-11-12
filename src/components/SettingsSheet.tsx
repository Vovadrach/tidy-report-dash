import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useI18n, type Lang } from "@/i18n";
import { useTheme, type ThemeMode } from "@/ui/theme";
import { Sheet } from "@/ui/Sheet";
import { Segmented } from "@/ui/Segmented";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

/** Параметри: тема (світла · темна · як у телефоні) і мова. Застосовуються одразу. */
export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("settings.title")}>
      <p className="mb-2 px-1 text-footnote font-semibold text-ink-3">{t("settings.theme")}</p>
      <Segmented<ThemeMode>
        value={mode}
        onChange={setMode}
        stacked
        options={[
          { value: "light", label: t("settings.theme.light"), icon: <Sun size={19} strokeWidth={2} /> },
          { value: "dark", label: t("settings.theme.dark"), icon: <Moon size={19} strokeWidth={2} /> },
          { value: "system", label: t("settings.theme.system"), icon: <Monitor size={19} strokeWidth={2} /> },
        ]}
      />
      <p className="mt-1.5 px-1 text-caption text-ink-4">{t("settings.themeHint")}</p>

      <p className="mb-2 mt-6 px-1 text-footnote font-semibold text-ink-3">{t("settings.language")}</p>
      <div className="list overflow-hidden rounded-[18px] bg-well [--list-inset:3.25rem]">
        {LANGS.map((l) => {
          const active = lang === l.code;
          return (
            <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={active}
              className="tap flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left">
              <span className="text-xl leading-none">{l.flag}</span>
              <span className="flex-1 text-body text-ink">{l.label}</span>
              {active && <Check size={19} strokeWidth={2.6} className="text-accent" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
