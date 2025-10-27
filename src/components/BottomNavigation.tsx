import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChartBar,
  PlusCircle,
  Clock as ClockIcon,
  House,
} from "@phosphor-icons/react";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Визначаємо поточну сторінку
  const isHomePage = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isReportsStatus = location.pathname === "/reports-status";
  const isSelectClient = location.pathname === "/select-client";
  const isCreateReport = location.pathname.startsWith("/create-report");

  // Показувати кнопку головна тільки не на головній
  const showHomeButton = !isHomePage;

  // Функція для переходу на головну
  const handleHomeClick = () => {
    navigate("/"); // Завжди йдемо на головну
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" data-no-swipe>
      {/* Градієнтний ефект розмиття (дим) */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: '200px' }}>
        {/* Розмиття backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)'
          }}
        ></div>

        {/* Градієнтний фон */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-30% to-transparent"
        ></div>
      </div>

      <div className="px-6 pb-6 relative pointer-events-auto">
        {/* Маленька кнопка Головна над панеллю */}
        {showHomeButton && (
          <div className="flex justify-center mb-2">
            <button
              onClick={handleHomeClick}
              className="bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.15),0_8px_24px_0_rgba(0,0,0,0.1)] rounded-full px-5 py-2.5 transition-all duration-150 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <House
                  size={18}
                  weight="bold"
                  color="#3C3C43"
                />
                <span
                  className="text-[12px] font-semibold tracking-[-0.01em]"
                  style={{ color: '#3C3C43' }}
                >
                  Головна
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Telegram-style панель з glass-morphism */}
        <div className="relative mx-auto" style={{ maxWidth: '360px' }}>
          {/* Головна панель */}
          <div className="bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.2),0_4px_16px_0_rgba(0,0,0,0.15)] rounded-[2.25rem] overflow-hidden relative">
            <div className="flex items-center h-[70px] px-2 gap-1 relative">
              {/* Ліва кнопка - Звіт */}
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] h-[56px] rounded-full transition-colors duration-150 active:bg-black/[0.08]"
                style={{ backgroundColor: isDashboard ? 'rgba(0, 0, 0, 0.045)' : 'transparent' }}
              >
                <ChartBar
                  size={27}
                  weight="fill"
                  color={isDashboard ? "#007AFF" : "#3C3C43"}
                />
                <span
                  className="text-[10.5px] font-medium tracking-[-0.01em]"
                  style={{ color: isDashboard ? '#007AFF' : '#3C3C43' }}
                >
                  Звіт
                </span>
              </button>

              {/* Центральна кнопка - Створити запис (завжди) */}
              <button
                onClick={() => navigate("/select-client")}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] h-[56px] rounded-full transition-colors duration-150 active:bg-black/[0.08]"
                style={{ backgroundColor: (isSelectClient || isCreateReport) ? 'rgba(0, 0, 0, 0.045)' : 'transparent' }}
              >
                <PlusCircle
                  size={27}
                  weight="fill"
                  color={(isSelectClient || isCreateReport) ? "#007AFF" : "#3C3C43"}
                />
                <span
                  className="text-[10.5px] font-medium tracking-[-0.01em]"
                  style={{ color: (isSelectClient || isCreateReport) ? '#007AFF' : '#3C3C43' }}
                >
                  Створити
                </span>
              </button>

              {/* Права кнопка - Очікую */}
              <button
                onClick={() => navigate("/reports-status")}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] h-[56px] rounded-full transition-colors duration-150 active:bg-black/[0.08]"
                style={{ backgroundColor: isReportsStatus ? 'rgba(0, 0, 0, 0.045)' : 'transparent' }}
              >
                <ClockIcon
                  size={27}
                  weight="fill"
                  color={isReportsStatus ? "#007AFF" : "#3C3C43"}
                />
                <span
                  className="text-[10.5px] font-medium tracking-[-0.01em]"
                  style={{ color: isReportsStatus ? '#007AFF' : '#3C3C43' }}
                >
                  Очікую
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};