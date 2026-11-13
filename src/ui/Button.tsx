import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Кнопки — одна формула.
 *  primary  — суцільний акцент; ОДНА завершальна дія на екран чи лист («Зберегти», «Створити»).
 *  tonal    — тон у заливці + текст того ж тону; дія над станом («Оплачено всі», «Додати»).
 *  neutral  — заливка колодязя; другорядна дія з вагою («Скасувати» в листі).
 *  ghost    — без заливки; тихі дії поруч із головною («Вийти», «Видалити запис»).
 *  danger   — суцільний червоний; лише в підтвердженні незворотного.
 * Без обводок і градієнтів. Вимкнена — та сама кнопка з прозорістю.
 */
export type ButtonVariant = "primary" | "tonal" | "neutral" | "ghost" | "danger";
export type Tone = "accent" | "ok" | "warn" | "alert";
type Size = "lg" | "md" | "sm";

const TONAL: Record<Tone, string> = {
  accent: "bg-accent-tint text-accent-ink",
  ok: "bg-ok-tint text-ok-ink",
  warn: "bg-warn-tint text-warn-ink",
  alert: "bg-alert-tint text-alert-ink",
};
const GHOST: Record<Tone, string> = {
  accent: "text-accent-ink",
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  alert: "text-alert-ink",
};
const SIZE: Record<Size, string> = {
  lg: "h-[3.25rem] rounded-[16px] px-5 text-headline",
  md: "h-11 rounded-[14px] px-4 text-callout font-semibold",
  sm: "h-9 rounded-[12px] px-3.5 text-footnote font-semibold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: Tone;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "neutral", tone = "accent", size = "md", block, icon, className, children, type = "button", ...props }, ref,
) {
  const look =
    variant === "primary" ? "bg-accent text-accent-on shadow-accent active:bg-[var(--accent-press)]" :
    variant === "danger" ? "bg-alert text-white" :
    variant === "tonal" ? TONAL[tone] :
    variant === "ghost" ? `bg-transparent ${tone === "accent" ? "text-ink-2" : GHOST[tone]}` :
    "bg-well text-ink";
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "press tap inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold disabled:opacity-45 disabled:shadow-none",
        SIZE[size], look, block && "w-full", className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

type IconVariant = "well" | "ghost" | "tonal" | "primary" | "surface";
const ICON_SIZE = { lg: "h-12 w-12", md: "h-10 w-10", sm: "h-8 w-8" } as const;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: IconVariant;
  tone?: Tone;
  size?: keyof typeof ICON_SIZE;
}

/** Кругла кнопка-іконка. Підпис обов'язковий — він і є доступна назва. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "well", tone = "accent", size = "md", className, children, type = "button", ...props }, ref,
) {
  const look =
    variant === "primary" ? "bg-accent text-accent-on shadow-accent" :
    variant === "tonal" ? TONAL[tone] :
    variant === "ghost" ? "text-ink-2" :
    variant === "surface" ? "bg-surface text-ink shadow-card" :
    "bg-well text-ink";
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn("press tap inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-40", ICON_SIZE[size], look, className)}
      {...props}
    >
      {children}
    </button>
  );
});
