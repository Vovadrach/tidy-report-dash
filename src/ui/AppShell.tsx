import type { ReactNode } from "react";
import { Dock } from "./Dock";
import { useSheets } from "./AppSheets";

/**
 * AppShell — оболонка головних вкладок «Ясно»: полотно + плаваючий док із FAB.
 * Екран усередині сам рендерить свій AppBar (sticky) і контент-контейнер.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { openQuickAdd } = useSheets();
  return (
    <div className="min-h-dvh bg-bg">
      {children}
      <Dock onAdd={() => openQuickAdd()} />
    </div>
  );
}
