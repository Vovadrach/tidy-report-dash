import { BottomNavigation } from '@/components/BottomNavigation';

export const QueryError = ({ message = 'Не вдалося завантажити дані. Перевірте інтернет і повторіть спробу.', onRetry }: { message?: string; onRetry: () => void }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
    <p role="alert" className="text-muted-foreground">{message}</p>
    <button onClick={onRetry} className="rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">Повторити спробу</button>
    <BottomNavigation />
  </div>
);
export const StaleDataNotice = ({ onRetry }: { onRetry: () => void }) => (
  <div role="status" className="card-flat p-3 text-sm text-warning">
    Дані не вдалося оновити. Показано останню збережену версію.
    <button className="ml-2 underline" onClick={onRetry}>Оновити</button>
  </div>
);
