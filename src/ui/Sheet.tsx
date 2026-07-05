import type { ReactNode } from "react";
import { Drawer } from "vaul";

/**
 * Sheet — нижній лист «Ясно» (vaul): drag-to-dismiss, safe-area, focus-trap.
 * Затемнення полотна ~10% чорнила (не чорне). Заголовок обов'язковий (a11y).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/10" />
        <Drawer.Content className="sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[32rem] flex-col outline-none">
          <div className="sheet-grabber" />
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-1">
            <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>
            <Drawer.Close className="btn btn-ghost !h-9 !w-9 !p-0" aria-label="Закрити">
              <XMark />
            </Drawer.Close>
          </div>
          <Drawer.Description className="sr-only">{description ?? title}</Drawer.Description>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
          {footer && (
            <div className="border-t border-line px-5 py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function XMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
