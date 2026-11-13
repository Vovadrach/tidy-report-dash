import { CloudOff, RefreshCw } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from './Button';
import { EmptyState } from './Screen';

/** Екран, якому немає чого показати: пояснення й одна дія. Док лишається, щоб не загубитися. */
export const QueryError = ({ message = 'Не вдалося завантажити дані. Перевірте інтернет і повторіть спробу.', onRetry }: { message?: string; onRetry: () => void }) => (
  <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 pb-40">
    <EmptyState tone="alert" icon={<CloudOff size={26} strokeWidth={2} />} title="Щось не так зі зв'язком" subtitle={message}
      action={<Button variant="primary" size="lg" onClick={onRetry} icon={<RefreshCw size={18} strokeWidth={2.3} />}>Повторити спробу</Button>} />
    <p role="alert" className="sr-only">{message}</p>
    <BottomNavigation />
  </div>
);

/** Дані застарілі, але є що показати: тиха плашка зверху змісту. */
export const StaleDataNotice = ({ onRetry }: { onRetry: () => void }) => (
  <div role="status" className="flex items-center gap-3 rounded-[16px] bg-warn-tint px-4 py-3 text-footnote font-medium text-warn-ink">
    <CloudOff size={17} strokeWidth={2.2} className="shrink-0" />
    <span className="flex-1">Дані не вдалося оновити. Показано останню збережену версію.</span>
    <button className="press shrink-0 font-semibold underline-offset-2 hover:underline" onClick={onRetry}>Оновити</button>
  </div>
);
