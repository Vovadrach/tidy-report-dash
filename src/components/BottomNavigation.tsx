import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ChartColumnBig, Clock, House, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useGo } from "@/ui/nav";
import { spring } from "@/ui/motion";

/**
 * Док — постійна точка опори внизу: Звіт · ＋ · Очікую (і «Головна» над ним
 * на інших розділах). Плаває над полотном на площині surface з м'якою тінню;
 * під ним — розмиття, щоб зміст не «врізався». Активний розділ — тонова
 * підкладка під іконкою, що перетікає між розділами. Між розділами док
 * стоїть на місці (власна назва view-transition).
 * Лише кнопки ловлять дотики — обгортка прозора для них (pointer-events-none).
 */
const NavItem = ({ icon: Icon, label, active, onClick }: { icon: typeof Clock; label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-current={active ? "page" : undefined}
    className="press flex flex-1 flex-col items-center gap-0.5 py-1">
    <span className="relative flex h-8 w-14 items-center justify-center">
      {active && <motion.span layoutId="dock-active" transition={spring.control} className="absolute inset-0 rounded-full bg-accent-tint" />}
      <Icon size={22} strokeWidth={active ? 2.3 : 1.9} className={cn("relative", active ? "text-accent-ink" : "text-ink-3")} />
    </span>
    <span className={cn("text-[0.6875rem] font-semibold", active ? "text-accent-ink" : "text-ink-3")}>{label}</span>
  </button>
);

export const BottomNavigation = ({ above }: { above?: ReactNode }) => {
  const location = useLocation();
  const { t } = useI18n();
  const go = useGo();
  const p = location.pathname;
  const isHome = p === "/";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40" data-no-swipe style={{ viewTransitionName: "dock" } as CSSProperties}>
      <div className="h-10 bg-gradient-to-t from-canvas to-transparent" />
      <div className="bg-canvas pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md px-3">
          {!isHome && (
            <div className="mb-2 flex justify-center">
              <button type="button" onClick={() => go("/", "tab")}
                className="press tap pointer-events-auto flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-footnote font-semibold text-accent-ink shadow-card">
                <House size={15} strokeWidth={2.4} /> {t("nav.home")}
              </button>
            </div>
          )}
          <div className="pointer-events-auto overflow-hidden rounded-[26px] bg-surface shadow-float">
            {above && <div className="px-2 pt-2">{above}</div>}
            <nav className="flex items-center gap-1 px-2 py-1.5">
              <NavItem icon={ChartColumnBig} label={t("nav.report")} active={p === "/dashboard"} onClick={() => go("/dashboard", "tab")} />
              <button type="button" onClick={() => go("/select-client", "push")} aria-label={t("nav.create")}
                className="press mx-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on shadow-accent">
                <Plus size={27} strokeWidth={2.5} />
              </button>
              <NavItem icon={Clock} label={t("nav.waiting")} active={p === "/reports-status"} onClick={() => go("/reports-status", "tab")} />
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
