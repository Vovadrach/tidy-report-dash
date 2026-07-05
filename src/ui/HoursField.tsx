import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { hoursToDecimal } from "@/domain/time";
import { round2 } from "@/domain/money";

/** Формат "Г:ХВ" (завжди з хвилинами) для дисплея. */
const fmt = (v: number): string => {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

/**
 * HoursField — ЄДИНИЙ віджет годин «Ясно» (фікс B3).
 * Степер −/+ (крок 15 хв) + тап на значення → ввід "Г:ХВ" або десяткових.
 * Внутрішньо — десяткові години (domain/time).
 */
export function HoursField({
  value,
  onChange,
  step = 0.25,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const bump = (dir: 1 | -1) => onChange(Math.max(0, round2(value + dir * step)));

  const startEdit = () => {
    setDraft(fmt(value));
    setEditing(true);
  };
  const commit = () => {
    const parsed = round2(hoursToDecimal(draft.trim()));
    onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Менше на 15 хв"
        onClick={() => bump(-1)}
        disabled={value <= 0}
        className="btn btn-ghost !h-11 !w-11 !p-0"
      >
        <Minus size={20} />
      </button>

      {editing ? (
        <input
          autoFocus
          inputMode="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="field display w-28 text-center text-2xl"
          placeholder="0:00"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="display min-w-28 rounded-[var(--r-field)] px-3 py-1.5 text-center text-3xl tabular-nums active:bg-surface-inset"
        >
          {fmt(value)}
        </button>
      )}

      <button
        type="button"
        aria-label="Більше на 15 хв"
        onClick={() => bump(1)}
        className="btn btn-ghost !h-11 !w-11 !p-0"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
