import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "accent" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  accent: "btn-accent",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

/** Кнопка мови «Ясно» (класи .btn / .btn-*). Реакція натиску — scale(0.98). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "accent", block, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn("btn", VARIANT[variant], block && "w-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
