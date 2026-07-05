import { NavLink } from "react-router-dom";
import { House, Wallet, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dock — нижня навігація «Ясно»: Стрічка · (+) · Гроші.
 * Світлий hairline-док (БЕЗ тіні), плаский синій FAB по центру, піднятий.
 * Клієнти доступні з app-bar і за глибокими посиланнями (імена клієнтів).
 * Обгортка pointer-events-none — тапи по контенту не перехоплюються.
 */
const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex flex-1 flex-col items-center gap-1 py-1.5 text-[0.7rem] font-medium transition-colors",
    isActive ? "text-accent" : "text-ink-3",
  );

export function Dock({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="pointer-events-auto relative w-full max-w-[32rem]">
        <nav className="dock flex items-stretch px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          <NavLink to="/" end className={tabClass}>
            {({ isActive }) => (
              <>
                <House size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>Стрічка</span>
              </>
            )}
          </NavLink>
          <div className="w-16 shrink-0" aria-hidden />
          <NavLink to="/money" className={tabClass}>
            {({ isActive }) => (
              <>
                <Wallet size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>Гроші</span>
              </>
            )}
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Додати запис"
          className="dock-fab absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full"
        >
          <Plus size={26} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
