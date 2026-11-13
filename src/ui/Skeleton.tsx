/** Скелет екрана: форма майбутнього змісту, без спінерів і стрибків. */
export const ScreenSkeleton = () => (
  <div className="min-h-dvh bg-canvas" aria-busy="true">
    <p role="status" className="sr-only">Завантаження...</p>
    <div className="mx-auto max-w-md space-y-4 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="skeleton h-8 w-44 rounded-full" />
      <div className="skeleton h-28 rounded-[20px]" />
      <div className="space-y-2.5 pt-3">
        <div className="skeleton h-5 w-28 rounded-full" />
        <div className="skeleton h-[4.5rem] rounded-[20px]" />
        <div className="skeleton h-[4.5rem] rounded-[20px]" />
      </div>
    </div>
  </div>
);
