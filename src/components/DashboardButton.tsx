import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DashboardButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/dashboard")}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-effect px-8 py-4 rounded-full shadow-xl hover:shadow-glow transition-smooth group"
    >
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary group-hover:text-primary-glow transition-smooth" />
        <span className="font-semibold text-foreground text-lg">Dashboard</span>
      </div>
    </button>
  );
};
