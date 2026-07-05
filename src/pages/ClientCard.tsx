import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar } from "@/ui/AppBar";

/** Заглушка — повна картка клієнта з історією у WP-4. */
export default function ClientCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        left={
          <button
            type="button"
            aria-label="Назад"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
          >
            <ArrowLeft size={20} />
          </button>
        }
        title="Клієнт"
      />
      <div className="container px-4 pt-6 text-ink-2">Картка клієнта {id} — скоро.</div>
    </div>
  );
}
