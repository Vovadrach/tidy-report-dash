import { useNavigate, useLocation } from "react-router-dom";
import {
  ChartBar,
  PlusCircle,
  Clock as ClockIcon,
  House,
} from "@phosphor-icons/react";
import { WorkerSelector } from "./WorkerSelector";

interface DockItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

const DockItem = ({ label, icon, active, onClick }: DockItemProps) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-full transition-all duration-150 active:scale-95 ${
      active ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-foreground/5"
    }`}
  >
    {icon}
    <span className="text-[10.5px] font-semibold tracking-tight">{label}</span>
  </button>
);

/**
 * Floating bottom dock.
 *
 * ВАЖЛИВО: обгортка повністю pointer-events-none — клікабельні лише самі
 * кнопки/панелі (pointer-events-auto). Інакше невидима смуга внизу екрана
 * перехоплює тапи по контенту сторінки (кнопки "Видалити" тощо).
 */
export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isReportsStatus = location.pathname === "/reports-status";
  const isSelectClient = location.pathname === "/select-client";
  const isCreateReport = location.pathname.startsWith("/create-report");
  const isCreateFlow = isSelectClient || isCreateReport;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      data-no-swipe
    >
      {/* Димка: розмиття + градієнт до фону, суто декоративна */}
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none">
        <div
          className="absolute inset-0 backdrop-blur-lg"
          style={{
            maskImage: "linear-gradient(to top, black 0%, black 35%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, black 35%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 via-35% to-transparent" />
      </div>

      <div
        className="relative px-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* WorkerSelector над панеллю (лише на головній) */}
        {isHomePage && (
          <div className="flex justify-center mb-2">
            <div className="w-full max-w-[360px] pointer-events-auto">
              <WorkerSelector />
            </div>
          </div>
        )}

        {/* Пігулка "Головна" над панеллю (на інших сторінках) */}
        {!isHomePage && (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => navigate("/")}
              className="pointer-events-auto glass-dock flex flex-col items-center justify-center gap-0.5 h-14 rounded-full px-8 transition-all duration-150 active:scale-95 text-primary"
            >
              <House size={26} weight="fill" />
              <span className="text-[10.5px] font-semibold tracking-tight">Головна</span>
            </button>
          </div>
        )}

        {/* Головна панель */}
        <div className="relative mx-auto max-w-[360px] pointer-events-auto">
          <div className="glass-dock rounded-[2.25rem] overflow-hidden">
            <div className="flex items-center h-[70px] px-2 gap-1">
              <DockItem
                label="Звіт"
                active={isDashboard}
                onClick={() => navigate("/dashboard")}
                icon={<ChartBar size={26} weight={isDashboard ? "fill" : "regular"} />}
              />
              <DockItem
                label="Створити"
                active={isCreateFlow}
                onClick={() => navigate("/select-client")}
                icon={<PlusCircle size={26} weight={isCreateFlow ? "fill" : "regular"} />}
              />
              <DockItem
                label="Очікую"
                active={isReportsStatus}
                onClick={() => navigate("/reports-status")}
                icon={<ClockIcon size={26} weight={isReportsStatus ? "fill" : "regular"} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
