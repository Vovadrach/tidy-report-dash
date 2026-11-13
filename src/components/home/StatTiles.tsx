import { Clock, Wallet } from "lucide-react";
import { MoneyNumber } from "@/ui/MoneyNumber";
import { IconFrame } from "@/ui/Screen";
import { decimalToHours } from "@/utils/timeFormat";
import { useI18n } from "@/i18n";

/**
 * Підсумок місяця — одна картка з двома показниками, розділеними внутрішньою
 * лінією. Великі цифри однакової ширини; підпис і іконка — тихі.
 */
export const StatTiles = ({ hours, earned }: { hours: number; earned: number }) => {
  const { t } = useI18n();
  return (
    <div className="card grid grid-cols-2">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <IconFrame size="sm"><Clock size={15} strokeWidth={2.3} /></IconFrame>
          <span className="text-footnote font-semibold text-ink-3">{t("common.hours")}</span>
        </div>
        <div className="num text-display text-ink">{decimalToHours(hours) || "0"}</div>
      </div>
      <div className="relative p-4 before:absolute before:inset-y-4 before:left-0 before:w-px before:bg-line">
        <div className="mb-3 flex items-center gap-2">
          <IconFrame size="sm"><Wallet size={15} strokeWidth={2.3} /></IconFrame>
          <span className="text-footnote font-semibold text-ink-3">{t("common.earned")}</span>
        </div>
        <div className="num text-display text-ink"><MoneyNumber value={earned} /><span className="ml-1 text-title font-semibold text-ink-3">€</span></div>
      </div>
    </div>
  );
};
