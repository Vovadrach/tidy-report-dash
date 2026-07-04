/** Скелетони маршрутів: контент не «стрибає», спінерів немає. */

const Line = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-full bg-muted ${className}`} />
);

const Card = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-3xl bg-muted ${className}`} />
);

/** Універсальний скелет екрана зі стрічкою карток. */
export const ScreenSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 pt-6 space-y-5">
      <div className="flex justify-center">
        <Line className="h-7 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="h-16" />
        <Card className="h-16" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="flex justify-center"><Line className="h-6 w-28" /></div>
        <Card className="h-14" />
        <Card className="h-14" />
        <div className="flex justify-center pt-2"><Line className="h-6 w-28" /></div>
        <Card className="h-14" />
      </div>
    </div>
  </div>
);
