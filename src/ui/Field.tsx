import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Поля вводу — колодязь (тон нижче за картку), без рамки. У фокусі колодязь
 * «піднімається» до картки й отримує акцентне кільце.
 */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode; icon?: ReactNode; wrapClassName?: string }>(
  function TextInput({ suffix, icon, className, wrapClassName, ...props }, ref) {
    return (
      <label className={cn("field flex h-12 min-w-0 items-center gap-2.5 px-3.5", wrapClassName)}>
        {icon && <span className="shrink-0 text-ink-3">{icon}</span>}
        <input ref={ref} className={cn("h-full min-w-0 flex-1 bg-transparent text-body outline-none", className)} {...props} />
        {suffix && <span className="shrink-0 text-callout font-medium text-ink-3">{suffix}</span>}
      </label>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("field block min-h-24 w-full resize-none px-3.5 py-3 text-body outline-none", className)} {...props} />;
});

/** Підпис поля над колодязем. */
export const FieldLabel = ({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) => (
  <label htmlFor={htmlFor} className={cn("mb-1.5 block px-1 text-footnote font-semibold text-ink-3", className)}>{children}</label>
);

/**
 * Рядок-налаштування в групі: іконка, підпис, значення й стрілка. Тап відкриває
 * лист вибору (дата, працівниці…). Значення завжди праворуч — око шукає його там.
 */
export const PickerRow = ({
  icon, label, value, onClick, disabled, ariaLabel, className, valueClassName,
}: {
  icon?: ReactNode; label: ReactNode; value?: ReactNode; onClick?: () => void; disabled?: boolean; ariaLabel?: string; className?: string; valueClassName?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={cn("tap flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left disabled:opacity-50", className)}
  >
    {icon}
    <span className="flex-1 text-body text-ink">{label}</span>
    <span className={cn("flex min-w-0 items-center gap-1.5 text-callout font-medium text-ink-2", valueClassName)}>{value}</span>
    <ChevronRight size={18} className="shrink-0 text-ink-4" />
  </button>
);
