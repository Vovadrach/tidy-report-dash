import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ReportsButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-effect px-8 py-4 rounded-full shadow-xl hover:shadow-glow transition-smooth group"
    >
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary group-hover:text-primary-glow transition-smooth" />
        <span className="font-semibold text-foreground text-lg">Звіти</span>
      </div>
    </button>
  );
};
