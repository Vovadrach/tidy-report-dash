import { AnimatePresence, motion } from "motion/react";
import { Check, Languages } from "lucide-react";
import { useI18n, type Lang } from "@/i18n";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang, setLang } = useI18n();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-foreground/15"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[32rem] rounded-t-[1.6rem] border-t border-border bg-card"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
            <div className="px-5 pb-[calc(1.6rem+env(safe-area-inset-bottom))] pt-3">
              <h2 className="mb-4 text-lg font-bold text-foreground">{t("settings.title")}</h2>
              <p className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
                <Languages size={16} strokeWidth={2.2} /> {t("settings.language")}
              </p>
              <div className="space-y-2">
                {LANGS.map((l) => {
                  const active = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLang(l.code)}
                      className={`press flex w-full items-center gap-3 rounded-xl border p-3.5 ${
                        active ? "border-primary bg-[hsl(var(--t-indigo-bg))]" : "border-border bg-card"
                      }`}
                    >
                      <span className="text-xl">{l.flag}</span>
                      <span className="flex-1 text-left font-semibold text-foreground">{l.label}</span>
                      {active && <Check size={18} strokeWidth={2.5} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
