import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "./motion";
import type { Tone } from "./Button";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Тон бігунка для сигнальних виборів (оплата). Без тону — нейтральний підйом. */
  tone?: Tone;
}

const THUMB: Record<Tone | "neutral", string> = {
  neutral: "bg-raised shadow-raised",
  accent: "bg-accent-tint",
  ok: "bg-ok-tint",
  warn: "bg-warn-tint",
  alert: "bg-alert-tint",
};
const INK: Record<Tone | "neutral", string> = {
  neutral: "text-ink",
  accent: "text-accent-ink",
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  alert: "text-alert-ink",
};

/**
 * Сегментований вибір 2–4 взаємовиключних варіантів. Трек — колодязь,
 * обраний — бігунок, що перетікає пружиною між варіантами (спільний layoutId).
 */
export function Segmented<T extends string>({
  options, value, onChange, disabled, size = "md", className, stacked,
}: {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "md" | "sm";
  /** Іконка над підписом (крупні кнопки статусу). */
  stacked?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex gap-1 rounded-[16px] bg-well p-1", className)} role="group">
      {options.map((option) => {
        const active = option.value === value;
        const tone = option.tone ?? "neutral";
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "press relative flex flex-1 items-center justify-center gap-1.5 rounded-[12px] font-semibold outline-none disabled:opacity-50",
              stacked ? "flex-col py-2.5 text-footnote" : size === "sm" ? "h-8 text-footnote" : "h-10 text-callout",
              active ? INK[tone] : "text-ink-3",
            )}
          >
            {active && (
              <motion.span layoutId={`seg-${id}`} transition={spring.control} className={cn("absolute inset-0 rounded-[12px]", THUMB[tone])} />
            )}
            <span className={cn("relative z-10 flex items-center gap-1.5", stacked && "flex-col gap-1")}>
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
