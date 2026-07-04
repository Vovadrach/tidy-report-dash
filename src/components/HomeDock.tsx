import { useNavigate } from "react-router-dom";
import { HouseSimple } from "@phosphor-icons/react";

/**
 * Плаваюча кнопка "Головна" для сторінок без повного дока
 * (вибір клієнта, створення запису).
 *
 * Обгортка pointer-events-none — клікабельна лише сама кнопка, щоб
 * невидима зона не блокувала кнопки контенту внизу сторінки.
 */
export const HomeDock = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" data-no-swipe>
      <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none bg-gradient-to-t from-background via-background/85 via-40% to-transparent" />

      <div
        className="relative flex justify-center px-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={() => navigate("/")}
          className="pointer-events-auto dock flex items-center gap-2 h-12 rounded-full px-6 transition-all duration-150 active:scale-95 text-primary"
        >
          <HouseSimple size={20} />
          <span className="text-xs font-extrabold tracking-wide">Головна</span>
        </button>
      </div>
    </div>
  );
};
