import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChartColumnBig, Plus, Clock, House } from "lucide-react";

/**
 * Нижня навігація v2 — СТАТИЧНА, пласка (без скла/blur/тіней).
 * Суцільний рядок-картка з hairline, кольоровий активний стан,
 * центральна кнопка «Створити» — заповнене коло primary.
 */
const NavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Clock;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="press flex flex-1 flex-col items-center gap-1 py-1.5"
  >
    <Icon
      size={23}
      strokeWidth={active ? 2.5 : 1.9}
      className={active ? "text-primary" : "text-muted-foreground"}
    />
    <span className={`text-[0.68rem] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
      {label}
    </span>
  </button>
);

export const BottomNavigation = ({ above }: { above?: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const go = (to: string) => navigate(to, { viewTransition: true });
  const p = location.pathname;
  const isHome = p === "/";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background to-transparent pt-6" data-no-swipe>
      <div className="mx-auto max-w-md px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))]">
        {above && <div className="mb-2">{above}</div>}
        {!isHome && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={() => go("/")}
              className="press flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary"
            >
              <House size={16} strokeWidth={2.4} /> Головна
            </button>
          </div>
        )}

        <nav className="flex items-center gap-1 rounded-[1.6rem] border border-border bg-card px-2 py-2">
          <NavItem
            icon={ChartColumnBig}
            label="Звіт"
            active={p === "/dashboard"}
            onClick={() => go("/dashboard")}
          />
          <button
            type="button"
            onClick={() => go("/select-client")}
            aria-label="Створити запис"
            className="press mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={26} strokeWidth={2.6} />
          </button>
          <NavItem
            icon={Clock}
            label="Очікую"
            active={p === "/reports-status"}
            onClick={() => go("/reports-status")}
          />
        </nav>
      </div>
    </div>
  );
};
