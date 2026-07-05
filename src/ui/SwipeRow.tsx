import { useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { Check, Trash2 } from "lucide-react";

/**
 * SwipeRow — свайп рядка (мова «Ясно»):
 * вправо (поріг 96px) = onSwipeRight (оплатити, тон ok),
 * вліво = onSwipeLeft (видалити, тон danger). Пружинне повернення.
 */
export function SwipeRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  disabled,
}: {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  disabled?: boolean;
}) {
  const x = useMotionValue(0);
  const [grabbing, setGrabbing] = useState(false);
  const THRESH = 96;
  const okOpacity = useTransform(x, [0, THRESH], [0, 1]);
  const dangerOpacity = useTransform(x, [-THRESH, 0], [1, 0]);

  if (disabled || (!onSwipeRight && !onSwipeLeft)) return <>{children}</>;

  return (
    <div className="relative overflow-hidden">
      {onSwipeRight && (
        <motion.div
          style={{ opacity: okOpacity }}
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 pl-4 text-ok"
        >
          <Check size={18} strokeWidth={2} />
          <span className="text-sm font-medium">Оплатити</span>
        </motion.div>
      )}
      {onSwipeLeft && (
        <motion.div
          style={{ opacity: dangerOpacity }}
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1.5 pr-4 text-danger"
        >
          <span className="text-sm font-medium">Видалити</span>
          <Trash2 size={18} strokeWidth={2} />
        </motion.div>
      )}
      <motion.div
        drag="x"
        style={{ x, background: "var(--surface)" }}
        dragConstraints={{ left: onSwipeLeft ? -140 : 0, right: onSwipeRight ? 140 : 0 }}
        dragElastic={0.12}
        onDragStart={() => setGrabbing(true)}
        onDragEnd={(_, info) => {
          setGrabbing(false);
          if (onSwipeRight && info.offset.x > THRESH) onSwipeRight();
          else if (onSwipeLeft && info.offset.x < -THRESH) onSwipeLeft();
          animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
        }}
        className={grabbing ? "cursor-grabbing" : ""}
      >
        {children}
      </motion.div>
    </div>
  );
}
