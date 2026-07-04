import { useNavigate } from "react-router-dom";
import { House } from "@phosphor-icons/react";

/**
 * Плаваюча пігулка "Головна" для сторінок без повної нижньої панелі
 * (вибір клієнта, створення запису).
 *
 * Обгортка pointer-events-none — клікабельна лише сама кнопка, щоб
 * невидима зона не блокувала кнопки контенту внизу сторінки.
 */
export const HomeDock = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" data-no-swipe>
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none">
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
        className="relative flex justify-center px-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={() => navigate("/")}
          className="pointer-events-auto glass-dock flex flex-col items-center justify-center gap-0.5 h-14 rounded-full px-8 transition-all duration-150 active:scale-95 text-primary"
        >
          <House size={26} weight="fill" />
          <span className="text-[10.5px] font-semibold tracking-tight">Головна</span>
        </button>
      </div>
    </div>
  );
};
