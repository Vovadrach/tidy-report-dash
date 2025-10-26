import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Plus,
  Clock,
} from "lucide-react";

export const BottomNavigation = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none h-40">
      {/* Плавний градієнт розмиття - від сильного до відсутнього */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
        }}
      ></div>

      {/* Градієнтний фон */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-40% to-transparent"></div>

      <div className="container mx-auto px-4 pb-4 relative pointer-events-auto flex items-end h-full">
        <div className="flex justify-center items-center gap-3 w-full mb-2">
          {/* Ліва кнопка - Звіт */}
          <Button
            variant="ghost"
            className="rounded-full bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 w-32 h-14 shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-blue-200/60 font-semibold"
            onClick={() => navigate("/dashboard")}
          >
            <BarChart3 className="h-5 w-5 stroke-[2.5]" />
            <span className="ml-2 text-sm font-semibold">Звіт</span>
          </Button>

          {/* Центральна кнопка - Створити запис */}
          <Button
            variant="ghost"
            className="rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white h-16 w-16 shadow-xl hover:shadow-2xl transition-all backdrop-blur-sm border-2 border-indigo-300/60 flex-shrink-0 animate-pulse hover:animate-none"
            onClick={() => navigate("/select-client")}
          >
            <Plus className="h-10 w-10 stroke-[3]" />
          </Button>

          {/* Права кнопка - Очікую */}
          <Button
            variant="ghost"
            className="rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 w-32 h-14 shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-emerald-200/60 font-semibold"
            onClick={() => navigate("/reports-status")}
          >
            <Clock className="h-5 w-5 stroke-[2.5]" />
            <span className="ml-2 text-sm font-semibold">Очікую</span>
          </Button>
        </div>
      </div>
    </div>
  );
};