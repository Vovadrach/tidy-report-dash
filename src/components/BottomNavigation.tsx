import { useNavigate, useLocation } from "react-router-dom";
import { ChartPieSlice, Plus, HourglassMedium, HouseSimple } from "@phosphor-icons/react";
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
    className={`flex-1 flex flex-col items-center justify-center gap-1 h-14 rounded-2xl transition-all duration-150 active:scale-95 ${
      active ? "text-primary" : "text-muted-foreground/70"
    }`}
  >
    {icon}
    <span className={`text-[10px] tracking-wide ${active ? "font-extrabold" : "font-semibold"}`}>
      {label}
    </span>
    <span
      className={`h-1 w-1 rounded-full transition-all ${active ? "bg-primary" : "bg-transparent"}`}
    />
  </button>
);

/**
 * Плаваючий нижній док.
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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      data-no-swipe
    >
      {/* М'який перехід контенту у фон під доком */}
      <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none bg-gradient-to-t from-background via-background/85 via-40% to-transparent" />

      <div
        className="relative px-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* WorkerSelector над доком (лише на головній) */}
        {isHomePage && (
          <div className="flex justify-center mb-2.5">
            <div className="w-full max-w-[340px] pointer-events-auto">
              <WorkerSelector />
            </div>
          </div>
        )}

        {/* Кнопка "Головна" над доком (на інших сторінках) */}
        {!isHomePage && (
          <div className="flex justify-center mb-2.5">
            <button
              onClick={() => navigate("/")}
              className="pointer-events-auto dock flex items-center gap-2 h-11 rounded-full px-5 transition-all duration-150 active:scale-95 text-primary"
            >
              <HouseSimple size={19} />
              <span className="text-xs font-extrabold tracking-wide">Головна</span>
            </button>
          </div>
        )}

        {/* Док: Звіт · FAB Створити · Очікую */}
        <div className="relative mx-auto max-w-[340px] pointer-events-auto">
          <div className="dock rounded-[2rem] px-3">
            <div className="flex items-center h-[74px] gap-1">
              <DockItem
                label="Звіт"
                active={isDashboard}
                onClick={() => navigate("/dashboard")}
                icon={<ChartPieSlice size={24} weight={isDashboard ? "fill" : "regular"} />}
              />
              <button
                onClick={() => navigate("/select-client")}
                aria-label="Створити запис"
                className="dock-fab -mt-8 h-[60px] w-[60px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-150 active:scale-90"
              >
                <Plus size={26} weight="bold" />
              </button>
              <DockItem
                label="Очікую"
                active={isReportsStatus}
                onClick={() => navigate("/reports-status")}
                icon={<HourglassMedium size={24} weight={isReportsStatus ? "fill" : "regular"} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
