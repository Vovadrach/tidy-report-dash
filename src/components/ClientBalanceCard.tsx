import { Clock, CurrencyEur as Euro } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { decimalToHours } from "@/domain/time";
import type { ClientBalance } from "@/domain/stats";

/** Картка боргу клієнта на екрані «Очікую». */
export const ClientBalanceCard = ({ balance }: { balance: ClientBalance }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/client-reports/${balance.clientId}`)}
      className="surface-card surface-card-hover p-4 cursor-pointer"
    >
      <div className="text-center mb-3">
        <p className="text-base font-bold text-foreground truncate">{balance.clientName}</p>
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
