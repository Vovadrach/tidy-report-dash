/** Скелетони маршрутів «Ясно»: контент не «стрибає», спінерів немає. */

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-full bg-surface-inset ${className}`} />
);

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-[var(--r-card)] bg-surface-inset ${className}`} />
);

/** Універсальний скелет екрана зі стрічкою рядків. */
export const ScreenSkeleton = () => (
  <div className="min-h-dvh bg-bg">
    <div className="container space-y-5 px-4 pt-6">
      <Bar className="h-8 w-40" />
      <Block className="h-3 w-full" />
      <div className="space-y-3 pt-3">
        <Bar className="h-4 w-24" />
        <Block className="h-14" />
        <Block className="h-14" />
        <Bar className="mt-2 h-4 w-24" />
        <Block className="h-14" />
      </div>
    </div>
  </div>
);
