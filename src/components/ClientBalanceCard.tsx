import { Clock, CurrencyEur as Euro, PaperPlaneTilt } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { decimalToHours } from "@/domain/time";
import { reminderMessage } from "@/domain/reminder";
import type { ClientBalance } from "@/domain/stats";

/** Картка боргу клієнта на екрані «Очікую». */
export const ClientBalanceCard = ({ balance }: { balance: ClientBalance }) => {
  const navigate = useNavigate();

  const handleRemind = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = reminderMessage(balance);
    // FR-3.2: share sheet або буфер обміну (desktop fallback)
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* користувачка скасувала — не помилка */
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Нагадування скопійовано", { description: "Встав його в чат із клієнтом" });
  };

  return (
    <div
      onClick={() => navigate(`/client-reports/${balance.clientId}`, { viewTransition: true })}
      className="surface-card surface-card-hover p-4 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-base font-bold text-foreground truncate flex-1 text-center pl-9">{balance.clientName}</p>
        <button
          onClick={handleRemind}
          aria-label={`Нагадати про борг: ${balance.clientName}`}
          className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/15 text-primary flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
        >
          <PaperPlaneTilt className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="chip chip-time py-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{decimalToHours(balance.unpaidHours)}</span>
        </div>

        <div className="chip chip-due py-2 text-sm">
          <Euro className="w-4 h-4" />
          <span>{Math.round(balance.totalDue)}€</span>
        </div>
      </div>
    </div>
  );
};
