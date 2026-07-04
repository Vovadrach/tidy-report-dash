import { PaperPlaneTilt } from "@phosphor-icons/react";
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground truncate">{balance.clientName}</p>
          <p className="caption-label mt-0.5">{decimalToHours(balance.unpaidHours)} год не оплачено</p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="display text-[1.45rem] text-foreground leading-none">{Math.round(balance.totalDue)} €</span>
          <button
            onClick={handleRemind}
            aria-label={`Нагадати про борг: ${balance.clientName}`}
            className="w-10 h-10 rounded-full dock flex items-center justify-center transition-all active:scale-90"
          >
            <PaperPlaneTilt className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
