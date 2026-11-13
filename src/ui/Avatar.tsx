import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Палітра приналежності — без фіолету; відтінки рівні за світлотою (OKLCH). */
const HUES = [250, 215, 190, 160, 135, 95, 70, 45, 20, 355];

export const hueFor = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

const SIZE = { sm: "h-8 w-8 text-caption", md: "h-10 w-10 text-footnote", lg: "h-12 w-12 text-callout", xl: "h-16 w-16 text-[1.375rem]" } as const;

/**
 * Аватар клієнта: ініціали на тоні приналежності. Той самий клієнт має той самий
 * колір на всіх екранах — це допомагає впізнавати його в списках без читання.
 */
export const ClientAvatar = ({
  name, id, size = "md", className, transitionName,
}: { name: string; id?: string; size?: keyof typeof SIZE; className?: string; transitionName?: string }) => (
  <span
    aria-hidden
    className={cn("avatar", SIZE[size], className)}
    style={{ "--h": hueFor(id ?? name), ...(transitionName ? { viewTransitionName: transitionName } : {}) } as CSSProperties}
  >
    {initials(name)}
  </span>
);

/** Крапка працівниці її власним кольором (з бази). */
export const WorkerDot = ({ color, className }: { color?: string; className?: string }) => (
  <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ background: color || "var(--ink-4)" }} />
);
