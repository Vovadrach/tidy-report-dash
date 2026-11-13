import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, type Tone } from "./Button";

/** Скрол сторінки помітний? — шапка отримує тінь-роздільник лише тоді. */
const useScrolled = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 6);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
};

/** Полотно екрана: одна ширина колонки й однакові поля на всіх сторінках. */
export const Screen = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("min-h-dvh bg-canvas text-ink", className)}>{children}</div>
);

export const Column = ({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "main" | "section" }) => (
  <Tag className={cn("mx-auto w-full max-w-md px-4", className)}>{children}</Tag>
);

/**
 * Верхня панель вкладених екранів: «назад» ліворуч, заголовок, дії праворуч.
 * Липка; поки сторінка не прокручена — зливається з полотном, після — отримує
 * тонку тінь, щоб відділитися від змісту, що пропливає під нею.
 */
export const TopBar = ({
  onBack, title, subtitle, leading, actions, backLabel = "Назад",
}: {
  onBack?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  backLabel?: string;
}) => {
  const scrolled = useScrolled();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-canvas/88 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-200",
        scrolled && "shadow-[0_1px_0_var(--line)]",
      )}
    >
      <Column className="flex h-14 items-center gap-2.5">
        {onBack && (
          <IconButton label={backLabel} onClick={onBack} variant="surface" className="-ml-0.5">
            <ChevronLeft size={22} strokeWidth={2.3} className="-ml-px" />
          </IconButton>
        )}
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-headline text-ink">{title}</h1>
          {subtitle && <p className="truncate text-footnote text-ink-3">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </Column>
    </header>
  );
};

/** Великий заголовок розділу дока (Звіт, Очікую). */
export const LargeTitle = ({ title, actions, className }: { title: ReactNode; actions?: ReactNode; className?: string }) => (
  <div className={cn("flex items-end justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.25rem)]", className)}>
    <h1 className="text-title text-ink">{title}</h1>
    {actions && <div className="flex shrink-0 items-center gap-2 pb-0.5">{actions}</div>}
  </div>
);

/** Підпис секції над групою. */
export const SectionLabel = ({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) => (
  <div className={cn("flex min-h-7 items-center justify-between gap-3 px-1", className)}>
    <h2 className="text-footnote font-semibold text-ink-3">{children}</h2>
    {action}
  </div>
);

const FRAME: Record<Tone | "neutral", string> = {
  neutral: "bg-well text-ink-2",
  accent: "bg-accent-tint text-accent-ink",
  ok: "bg-ok-tint text-ok-ink",
  warn: "bg-warn-tint text-warn-ink",
  alert: "bg-alert-tint text-alert-ink",
};

/** Іконка в тоновій рамці: колір = сенс (сигнал або акцент), не прикраса. */
export const IconFrame = ({ tone = "neutral", size = "md", children, className }: { tone?: Tone | "neutral"; size?: "sm" | "md" | "lg"; children: ReactNode; className?: string }) => (
  <span className={cn(
    "inline-flex shrink-0 items-center justify-center",
    size === "sm" ? "h-7 w-7 rounded-[9px]" : size === "lg" ? "h-14 w-14 rounded-[18px]" : "h-9 w-9 rounded-[11px]",
    FRAME[tone], className,
  )}>
    {children}
  </span>
);

/** Порожній стан: що тут буде і що зробити далі. */
export const EmptyState = ({
  icon, tone = "accent", title, subtitle, action, className,
}: { icon: ReactNode; tone?: Tone | "neutral"; title: string; subtitle?: string; action?: ReactNode; className?: string }) => (
  <div className={cn("rise-in flex flex-col items-center px-6 py-14 text-center", className)}>
    <IconFrame tone={tone} size="lg" className="mb-4">{icon}</IconFrame>
    <p className="text-headline text-ink">{title}</p>
    {subtitle && <p className="mt-1 max-w-64 text-callout text-ink-3">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
