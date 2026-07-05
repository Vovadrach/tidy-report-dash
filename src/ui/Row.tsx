import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Row — універсальний рядок списку (мова «Ясно»):
 * leading (StatusDot/аватар) · title+subtitle · meta · trailing.
 * Клікабельний → рендериться як <button> з натиск-фідбеком (.row:active).
 */
export function Row({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-medium leading-tight">{title}</div>
        {subtitle != null && <div className="caption truncate mt-0.5">{subtitle}</div>}
      </div>
      {meta && <div className="shrink-0 text-right tnum">{meta}</div>}
      {trailing}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("row", className)}>
        {content}
      </button>
    );
  }
  return <div className={cn("row", className)}>{content}</div>;
}
