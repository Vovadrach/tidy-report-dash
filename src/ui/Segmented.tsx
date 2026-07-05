import { cn } from "@/lib/utils";

export type SegTone = "accent" | "ok" | "warn" | "danger" | "neutral";

const TONE_TEXT: Record<SegTone, string> = {
  accent: "text-accent",
  ok: "text-ok",
  warn: "text-[color:color-mix(in_oklab,var(--warn)_82%,black)]",
  danger: "text-danger",
  neutral: "text-ink",
};

/** Segmented — сегмент-контрол «Ясно» (статус оплати, вкладки Гроші, фільтри). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; tone?: SegTone }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-[var(--r-field)] bg-surface-inset p-1", className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[calc(var(--r-field)-0.25rem)] px-2 py-2 text-sm font-medium transition-colors",
              active ? cn("bg-surface", TONE_TEXT[o.tone ?? "accent"]) : "text-ink-2 active:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
