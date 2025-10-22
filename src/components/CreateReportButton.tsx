import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CreateReportButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/create-report")}
      className="fixed top-8 left-1/2 -translate-x-1/2 z-50 glass-effect px-8 py-4 rounded-full shadow-xl hover:shadow-glow transition-smooth group"
    >
      <div className="flex items-center gap-3">
        <Plus className="w-6 h-6 text-primary group-hover:text-primary-glow transition-smooth" />
        <span className="font-semibold text-foreground text-lg">Створити звіт</span>
      </div>
    </button>
  );
};
