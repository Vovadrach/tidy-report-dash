import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Порожній стан: тепла пляма-«подушка», один заклик до дії. */
export const EmptyState = ({ icon, title, subtitle, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="icon-badge icon-badge-time w-16 h-16 mb-4 [&_svg]:w-8 [&_svg]:h-8">
      {icon}
    </div>
    <p className="display text-xl text-foreground mb-1">{title}</p>
    {subtitle && <p className="caption-label mb-4">{subtitle}</p>}
    {action}
  </div>
);
