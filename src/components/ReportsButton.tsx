import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ReportsButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-effect px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-smooth group"
    >
      <div className="flex items-center gap-2">
        <ArrowLeft className="w-5 h-5 text-primary group-hover:text-primary/80 transition-smooth" />
        <span className="font-semibold text-foreground text-sm">Звіти</span>
      </div>
    </button>
  );
};
