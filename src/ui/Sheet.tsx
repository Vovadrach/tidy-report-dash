import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring, tween } from "./motion";
import { IconButton } from "./Button";

/**
 * Нижній лист — ЄДИНИЙ спосіб показати вибір чи введення поверх екрана
 * (дата, години, оплата, працівниці, клієнт, параметри). Центрованих модалок немає.
 *
 * Стани: закритий → відкривається (затемнення 0→1, лист виїжджає пружиною знизу)
 * → відкритий (фокус усередині, фон не прокручується) → закривається (швидше, ніж
 * відкривався). Закрити можна: ✕, тап по затемненню, Escape, свайп униз за ручку
 * або заголовок (поріг — 110px або швидкий змах). Коли відкрита клавіатура, лист
 * піднімається над нею.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Не показувати кнопку ✕ (наприклад, коли в підвалі вже є «Скасувати»). */
  hideClose?: boolean;
  className?: string;
  bodyClassName?: string;
}

/** Висота екранної клавіатури (iOS не змінює layout viewport). */
const useKeyboardInset = (active: boolean) => {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) { setInset(0); return; }
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [active]);
  return inset;
};

export function Sheet({ open, onOpenChange, title, description, children, footer, hideClose, className, bodyClassName }: SheetProps) {
  const controls = useDragControls();
  const keyboard = useKeyboardInset(open);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-[60] bg-[var(--scrim)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: tween.base }}
                  exit={{ opacity: 0, transition: tween.exit }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                forceMount
                {...(description ? {} : { "aria-describedby": undefined })}
                // Фокус — на сам лист, а не на ✕: кільце фокуса не «спалахує» при відкритті дотиком.
                onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true }); }}
              >
                <motion.div
                  data-no-swipe
                  className={cn(
                    "fixed inset-x-0 z-[61] mx-auto flex max-h-[min(92dvh,46rem)] w-full max-w-lg flex-col rounded-t-[var(--r-xl)] bg-overlay shadow-sheet outline-none",
                    className,
                  )}
                  style={{ bottom: keyboard }}
                  initial={{ y: "100%" }}
                  animate={{ y: 0, transition: spring.sheet }}
                  exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
                  drag="y"
                  dragControls={controls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.04, bottom: 0.75 }}
                  onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 650) onOpenChange(false); }}
                >
                  <div className="cursor-grab touch-none select-none" onPointerDown={(event) => controls.start(event)}>
                    <div className="mx-auto mb-1 mt-2 h-[5px] w-9 rounded-full bg-well-strong" />
                    <div className="flex items-start gap-3 px-5 pb-3 pt-2">
                      <div className="min-w-0 flex-1 pt-1">
                        <Dialog.Title className="text-[1.25rem] font-bold leading-7 tracking-[-0.015em] text-ink">{title}</Dialog.Title>
                        {description && <Dialog.Description className="mt-0.5 text-footnote text-ink-3">{description}</Dialog.Description>}
                      </div>
                      {!hideClose && (
                        <Dialog.Close asChild>
                          <IconButton label="Закрити" size="sm" className="mt-0.5"><X size={17} strokeWidth={2.4} /></IconButton>
                        </Dialog.Close>
                      )}
                    </div>
                  </div>
                  <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2", !footer && "pb-[calc(1.25rem+env(safe-area-inset-bottom))]", bodyClassName)}>
                    {children}
                  </div>
                  {footer && (
                    <div className={cn("flex gap-2.5 px-5 pt-3", keyboard > 0 ? "pb-3" : "pb-[calc(1rem+env(safe-area-inset-bottom))]")}>
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
