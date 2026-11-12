import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AnimatePresence, motion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { spring, tween } from "./motion";
import { Button } from "./Button";

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

/**
 * Підтвердження незворотної дії: той самий лист знизу, але без свайпу й ✕ —
 * рішення приймається лише однією з двох кнопок (або Escape = скасувати).
 */
export const ConfirmSheet = ({
  open, onOpenChange, title, description, confirmLabel = "Видалити", cancelLabel = "Скасувати", onConfirm, confirmDisabled = false,
}: ConfirmSheetProps) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal forceMount>
      <AnimatePresence>
        {open && (
          <>
            <AlertDialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[70] bg-[var(--scrim)]"
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: tween.base }} exit={{ opacity: 0, transition: tween.exit }} />
            </AlertDialog.Overlay>
            <AlertDialog.Content asChild forceMount>
              <motion.div
                data-no-swipe
                className="fixed inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-lg rounded-t-[var(--r-xl)] bg-overlay px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 shadow-sheet outline-none"
                initial={{ y: "100%" }} animate={{ y: 0, transition: spring.sheet }} exit={{ y: "100%", transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              >
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-alert-tint text-alert-ink">
                  <TriangleAlert size={22} strokeWidth={2.2} />
                </span>
                <AlertDialog.Title className="text-center text-[1.25rem] font-bold leading-7 tracking-[-0.015em] text-ink">{title}</AlertDialog.Title>
                <AlertDialog.Description className="mx-auto mt-1.5 max-w-xs text-center text-callout text-ink-3">{description}</AlertDialog.Description>
                <div className="mt-6 flex gap-2.5">
                  <AlertDialog.Cancel asChild>
                    <Button variant="neutral" size="lg" block>{cancelLabel}</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button
                      variant="danger" size="lg" block disabled={confirmDisabled}
                      onClick={(event) => {
                        // Власник сам закриває керований лист: автоматичне закриття Radix
                        // скинуло б блокувальник навігації одразу після proceed().
                        event.preventDefault();
                        onConfirm();
                      }}
                    >
                      {confirmLabel}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </motion.div>
            </AlertDialog.Content>
          </>
        )}
      </AnimatePresence>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
