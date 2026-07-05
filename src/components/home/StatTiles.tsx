import NumberFlow from "@number-flow/react";
import { Clock, Wallet } from "lucide-react";
import { decimalToHours } from "@/utils/timeFormat";

/**
 * StatTiles — дашборд головної: яскраві ПЛАСКІ колірні плитки (без тіней).
 * Години (violet) + Заробіток (indigo).
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

export const StatTiles = ({ hours, earned }: { hours: number; earned: number }) => (
  <div className="grid grid-cols-2 gap-3">
    <Tile tint="tint-violet" icon={Clock} label="Години">
      {decimalToHours(hours)}
    </Tile>
    <Tile tint="tint-indigo" icon={Wallet} label="Заробіток">
      <NumberFlow value={Math.round(earned)} />€
    </Tile>
  </div>
);
