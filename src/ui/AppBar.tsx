import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AppBar — липка верхня панель «Ясно» (майже суцільна, hairline знизу, blur).
 * Проста форма: left · title · right. Складна (велике число тощо) — через children.
 */
export function AppBar({
  left,
  title,
  right,
  children,
  className,
}: {
  left?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("app-bar sticky top-0 z-20", className)}>
      <div className="container px-4">
        {children ?? (
          <div className="flex min-h-[3.5rem] items-center gap-2 py-2">
            {left}
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
            {right}
          </div>
        )}
      </div>
    </header>
  );
}
