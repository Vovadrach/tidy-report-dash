import NumberFlow from "@number-flow/react";
import { Clock, Wallet, CircleCheckBig, CircleAlert } from "lucide-react";
import { decimalToHours } from "@/utils/timeFormat";

/**
 * StatTiles — дашборд головної: яскраві ПЛАСКІ колірні плитки (без тіней).
 * Години (violet), Заробіток (indigo) + тонкий рядок сплачено/борг.
 */
const Tile = ({
  tint,
  icon: Icon,
  label,
  children,
}: {
  tint: string;
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded-2xl p-4 ${tint}`}>
    <div className="mb-2.5 flex items-center gap-2">
      <span className="ibadge h-8 w-8 bg-white/70">
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{label}</span>
    </div>
    <div className="num-display text-[1.7rem] leading-none text-foreground">{children}</div>
  </div>
);

export const StatTiles = ({
  hours,
  earned,
  paid,
}: {
  hours: number;
  earned: number;
  paid: number;
}) => {
  const due = Math.max(0, Math.round(earned - paid));
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-3">
        <Tile tint="tint-violet" icon={Clock} label="Години">
          {decimalToHours(hours)}
        </Tile>
        <Tile tint="tint-indigo" icon={Wallet} label="Заробіток">
          <NumberFlow value={Math.round(earned)} />€
        </Tile>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="tint-emerald flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <CircleCheckBig size={15} strokeWidth={2.4} />
          <span className="text-xs font-semibold opacity-90">Сплачено</span>
          <span className="num-display ml-auto text-sm text-foreground">
            <NumberFlow value={Math.round(paid)} />€
          </span>
        </div>
        <div className="tint-rose flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <CircleAlert size={15} strokeWidth={2.4} />
          <span className="text-xs font-semibold opacity-90">Борг</span>
          <span className="num-display ml-auto text-sm text-foreground">
            <NumberFlow value={due} />€
          </span>
        </div>
      </div>
    </div>
  );
};
