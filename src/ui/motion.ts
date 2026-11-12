import type { Transition } from "motion/react";

/**
 * Словник руху. Пружини підібрані за «масою» поверхні: що легше — то жвавіше.
 * Виходи завжди швидші за входи: інтерфейс не змушує чекати.
 */
export const spring = {
  /** Перемикачі, бігунки сегментів, галочки. */
  control: { type: "spring", stiffness: 560, damping: 40, mass: 0.8 } as Transition,
  /** Відгук стану: іконка статусу, лічильник. */
  pop: { type: "spring", stiffness: 520, damping: 26, mass: 0.7 } as Transition,
  /** Розгортання блоку на місці (висота). */
  expand: { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as Transition,
  /** Нижній лист: вагома поверхня. */
  sheet: { type: "spring", stiffness: 420, damping: 40, mass: 0.95 } as Transition,
} as const;

export const tween = {
  fast: { duration: 0.14, ease: [0.4, 0, 0.2, 1] } as Transition,
  base: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as Transition,
  exit: { duration: 0.16, ease: [0.4, 0, 1, 1] } as Transition,
} as const;

/** Розгортання на місці: висота від 0 до авто з проявом змісту. */
export const reveal = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { height: spring.expand, opacity: { duration: 0.2, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.18, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.1 } } },
} as const;

/** Затримка каскаду для елементів списку (у секундах для CSS animation-delay). */
export const stagger = (index: number, step = 0.03, max = 0.24) => ({ animationDelay: `${Math.min(index * step, max)}s` });
