import { useRef, type ReactNode } from "react";
import { motion, useAnimation } from "motion/react";
import { CheckCircle, Trash } from "@phosphor-icons/react";

interface SwipeableRowProps {
  children: ReactNode;
  /** Свайп вправо: позначити оплаченим */
  onSwipeRight?: () => void;
  /** Свайп вліво: видалити (з подальшим підтвердженням) */
  onSwipeLeft?: () => void;
  disabled?: boolean;
}

const THRESHOLD = 96;

/**
 * Свайп-дії картки (FR-1.3): вправо = оплачено, вліво = видалити.
 * dragDirectionLock не конфліктує з вертикальним скролом стрічки.
 */
export const SwipeableRow = ({ children, onSwipeRight, onSwipeLeft, disabled }: SwipeableRowProps) => {
  const controls = useAnimation();
  const fired = useRef(false);

  if (disabled) return <>{children}</>;

  return (
    <div className="relative">
      {/* Афорданси під карткою */}
      <div className="absolute inset-0 flex items-center justify-between rounded-3xl overflow-hidden">
        <div className="flex items-center gap-2 pl-5 text-success">
          <CheckCircle size={22} weight="fill" />
          <span className="text-xs font-bold">Оплачено</span>
        </div>
        <div className="flex items-center gap-2 pr-5 text-destructive">
          <span className="text-xs font-bold">Видалити</span>
          <Trash size={22} weight="fill" />
        </div>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.35, right: 0.35 }}
        animate={controls}
        onDragEnd={(_e, info) => {
          if (fired.current) return;
          if (info.offset.x > THRESHOLD && onSwipeRight) {
            fired.current = true;
            onSwipeRight();
            controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } })
              .then(() => { fired.current = false; });
          } else if (info.offset.x < -THRESHOLD && onSwipeLeft) {
            fired.current = true;
            onSwipeLeft();
            controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } })
              .then(() => { fired.current = false; });
          }
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
};
