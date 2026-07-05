import { Segmented } from "./Segmented";
import { formatHours } from "./format";

export type AmountMode = "fromHours" | "fromAmount";

/**
 * AmountField — сума € з перемикачем «від годин ↔ від суми» (фікс B2).
 * У режимі fromHours поле readonly і показує години×ставку (єдине джерело —
 * батько рахує value = round2(hours*rate)); у fromAmount користувач вводить суму.
 */
export function AmountField({
  value,
  onChange,
  mode,
  onModeChange,
  rate,
  hours,
}: {
  value: number;
  onChange: (n: number) => void;
  mode: AmountMode;
  onModeChange: (m: AmountMode) => void;
  rate: number;
  hours: number;
}) {
  const readOnly = mode === "fromHours";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="caption">Сума</label>
        <Segmented<AmountMode>
          className="w-44"
          options={[
            { value: "fromHours", label: "від годин" },
            { value: "fromAmount", label: "від суми" },
          ]}
          value={mode}
          onChange={onModeChange}
        />
      </div>
      <div className="relative">
        <input
          inputMode="decimal"
          readOnly={readOnly}
          value={value ? String(value) : readOnly ? String(value) : ""}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0))}
          placeholder="0"
          className={`field display pr-9 text-xl ${readOnly ? "text-ink-2" : ""}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">€</span>
      </div>
      {readOnly && rate > 0 && (
        <p className="caption">
          {formatHours(hours) || "0 г"} × {rate} €/год
        </p>
      )}
    </div>
  );
}
