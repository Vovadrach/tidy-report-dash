import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AddWorkDayButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/create-report")}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-effect px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-smooth group"
    >
      <div className="flex items-center gap-2">
        <Plus className="w-5 h-5 text-success group-hover:text-success/80 transition-smooth" />
        <span className="font-semibold text-foreground text-sm">Записати день</span>
      </div>
    </button>
  );
};
