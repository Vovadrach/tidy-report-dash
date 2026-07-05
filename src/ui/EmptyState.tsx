import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Порожній стан «Ясно»: нейтральне коло-іконка, один заклик до дії. */
export const EmptyState = ({ icon, title, subtitle, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-inset text-ink-3 [&_svg]:h-7 [&_svg]:w-7">
      {icon}
    </div>
    <p className="text-lg font-semibold">{title}</p>
    {subtitle && <p className="caption mb-4 mt-1 max-w-[17rem]">{subtitle}</p>}
    {action}
  </div>
);
