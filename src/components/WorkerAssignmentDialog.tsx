import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, Scale } from 'lucide-react';
import { readStringArray, safeStorage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { allocateUnits, formatMoney, parseNumber, round2, validateSplit } from '@/domain/money';
import { useAddWorker } from '@/data/queries';
import type { Worker } from '@/domain/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { TextInput } from '@/ui/Field';
import { reveal, spring } from '@/ui/motion';

interface WorkerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Worker[];
  selectedWorkers: string[];
  workerAmounts: Record<string, string>;
  totalAmount: number;
  onWorkersChange: (selectedWorkers: string[], workerAmounts: Record<string, string>) => void;
}

/**
 * «Хто працював» — розподіл суми запису між помічницями.
 * Тап по рядку додає/прибирає помічницю; у позначених праворуч з'являється сума.
 * Перша позначена автоматично отримує залишок, тож сума завжди сходиться.
 * Смуга зверху показує частки їхніми кольорами; «Порівну» ділить одним дотиком.
 * Зміни застосовуються лише після «Готово».
 */
export const WorkerAssignmentDialog = ({
  open, onOpenChange, workers, selectedWorkers: initialSelectedWorkers, workerAmounts: initialWorkerAmounts, totalAmount, onWorkersChange,
}: WorkerAssignmentDialogProps) => {
  const { t } = useI18n();
  const addWorker = useAddWorker();
  const { user } = useAuth();
  const recentKey = `aria-recent-workers:${user?.id ?? 'demo'}`;
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initialSelectedWorkers);
  const [workerAmounts, setWorkerAmounts] = useState<Record<string, string>>(initialWorkerAmounts);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  useEffect(() => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
  }, [initialSelectedWorkers, initialWorkerAmounts, open]);

  const sortedWorkers = (() => {
    const recentWorkers: string[] = readStringArray(recentKey);
    return [...workers].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const aIndex = recentWorkers.indexOf(a.id);
      const bIndex = recentWorkers.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  })();

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers(prev => {
      if (prev.includes(workerId)) {
        const newAmounts = { ...workerAmounts };
        delete newAmounts[workerId];
        setWorkerAmounts(newAmounts);
        return prev.filter(id => id !== workerId);
      }
      const newSelected = [...prev, workerId];
      if (newSelected.length === 1) setWorkerAmounts({ [workerId]: totalAmount.toString() });
      else setWorkerAmounts(current => ({ ...current, [workerId]: '0' }));
      return newSelected;
    });
  };

  const handleAmountChange = (workerId: string, value: string) => {
    const newAmount = parseNumber(value) || 0;
    const updatedAmounts = { ...workerAmounts, [workerId]: value };
    if (selectedWorkers.length > 1) {
      const firstWorkerId = selectedWorkers[0];
      if (!firstWorkerId) return;
      let sumOfOthers = 0;
      selectedWorkers.forEach(id => {
        if (id !== firstWorkerId) {
          const amount = id === workerId ? newAmount : (parseNumber(updatedAmounts[id] || '0') || 0);
          sumOfOthers += amount;
        }
      });
      if (sumOfOthers > totalAmount) {
        sumOfOthers = totalAmount;
        updatedAmounts[workerId] = totalAmount.toString();
      }
      updatedAmounts[firstWorkerId] = round2(Math.max(0, totalAmount - sumOfOthers)).toString();
    } else if (newAmount > totalAmount) {
      updatedAmounts[workerId] = totalAmount.toString();
    }
    setWorkerAmounts(updatedAmounts);
  };

  /** Порівну: цілі євро, якщо сума ціла; залишок — найбільшим часткам першими. */
  const splitEvenly = () => {
    const n = selectedWorkers.length;
    if (n < 2) return;
    const whole = Number.isInteger(totalAmount);
    const units = allocateUnits(whole ? totalAmount : Math.round(totalAmount * 100), Array(n).fill(1));
    setWorkerAmounts(Object.fromEntries(selectedWorkers.map((id, i) => [id, String(whole ? units[i] : units[i] / 100)])));
  };

  const handleAddWorker = () => {
    const name = newWorkerName.trim();
    if (!name || addWorker.isPending) return;
    addWorker.mutate({ name, makePrimary: workers.length === 0 }, {
      onSuccess: (worker) => {
        safeStorage.setItem(recentKey, JSON.stringify([worker.id, ...readStringArray(recentKey)].slice(0, 20)));
        setNewWorkerName('');
        setIsAddingWorker(false);
      },
    });
  };

  const split = validateSplit(totalAmount, selectedWorkers.map((id) => ({ workerId: id, amount: parseNumber(workerAmounts[id] || '0') })));

  const handleConfirm = () => {
    if (!split.valid || selectedWorkers.some(id => !workers.some(w => w.id === id))) return;
    safeStorage.setItem(recentKey, JSON.stringify(selectedWorkers));
    onWorkersChange(selectedWorkers, workerAmounts);
    onOpenChange(false);
  };
  const handleCancel = () => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
    onOpenChange(false);
  };

  const balanced = Math.abs(split.remainder) < 0.01;
  const message = selectedWorkers.length === 0 ? null
    : !split.valid && balanced ? t('workers.enterAmounts')
    : split.remainder > 0.004 ? t('workers.remaining', { sum: formatMoney(split.remainder) })
    : split.remainder < -0.004 ? t('workers.over', { sum: formatMoney(Math.abs(split.remainder)) })
    : t('workers.allSet');
  const messageTone = selectedWorkers.length === 0 ? '' : split.valid ? 'text-ok-ink' : split.remainder < 0 ? 'text-alert-ink' : 'text-warn-ink';

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleCancel())}
      title={t('workers.title')} description={`${t('workers.total')} · ${formatMoney(totalAmount)} €`} hideClose
      footer={<>
        <Button variant="neutral" size="lg" block onClick={handleCancel}>{t('common.cancel')}</Button>
        <Button variant="primary" size="lg" block disabled={!split.valid} onClick={handleConfirm}>{t('common.done')}</Button>
      </>}>
      {/* Смуга розподілу кольорами помічниць */}
      <div className="mb-3 rounded-[16px] bg-well p-3.5">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-well-strong">
          {selectedWorkers.map((id) => {
            const worker = workers.find((w) => w.id === id);
            const share = totalAmount > 0 ? Math.max(0, Math.min(1, (parseNumber(workerAmounts[id] || '0') || 0) / totalAmount)) : 0;
            return <motion.span key={id} className="h-full rounded-full" style={{ background: worker?.color }} initial={false} animate={{ width: `${share * 100}%` }} transition={spring.expand} />;
          })}
        </div>
        <div className="mt-2.5 flex min-h-8 items-center justify-between gap-2">
          <span className={cn('text-footnote font-semibold', messageTone || 'text-ink-3')}>{message ?? t('workers.subtitle')}</span>
          {selectedWorkers.length > 1 && (
            <Button size="sm" variant="tonal" onClick={splitEvenly} icon={<Scale size={15} strokeWidth={2.2} />}>{t('workers.even')}</Button>
          )}
        </div>
      </div>

      <div className="list [--list-inset:3.5rem]">
        {sortedWorkers.map((worker) => {
          const active = selectedWorkers.includes(worker.id);
          return (
            <div key={worker.id} className="flex items-center gap-2 py-1">
              <button type="button" onClick={() => toggleWorker(worker.id)} aria-pressed={active}
                className="tap flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-[14px] py-1.5 pr-2 text-left">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-footnote font-bold text-white" style={{ background: worker.color }}>
                  {worker.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-headline text-ink">{worker.name}</span>
                  {worker.isPrimary && <span className="block text-caption text-ink-3">{t('workers.primary')}</span>}
                </span>
                {!active && <span className="h-6 w-6 shrink-0 rounded-full bg-well-strong" aria-hidden />}
                {active && (
                  <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring.pop}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </motion.span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 104, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={spring.expand} className="shrink-0 overflow-hidden">
                    <TextInput inputMode="decimal" aria-label={`Частка: ${worker.name}`} suffix="€" wrapClassName="h-11 w-[104px] px-3" className="num text-right font-semibold"
                      value={workerAmounts[worker.id] || ''}
                      onChange={(e) => handleAmountChange(worker.id, e.target.value)}
                      onFocus={(e) => {
                        if (workerAmounts[worker.id] === '0' || !workerAmounts[worker.id]) setWorkerAmounts(prev => ({ ...prev, [worker.id]: '' }));
                        else e.target.select();
                      }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="py-1">
          {!isAddingWorker ? (
            <button type="button" onClick={() => setIsAddingWorker(true)} className="tap flex min-h-12 w-full items-center gap-3 rounded-[14px] py-1.5 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-tint text-accent-ink"><Plus size={18} strokeWidth={2.4} /></span>
              <span className="text-headline text-accent-ink">{t('workers.new')}</span>
            </button>
          ) : (
            <AnimatePresence initial>
              <motion.div {...reveal} className="overflow-hidden">
                <div className="flex gap-2 py-1.5">
                  <TextInput autoFocus value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} placeholder={t('workers.namePlaceholder')}
                    aria-label={t('workers.namePlaceholder')} wrapClassName="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddWorker();
                      if (e.key === 'Escape') { e.stopPropagation(); setIsAddingWorker(false); setNewWorkerName(''); }
                    }} />
                  <Button variant="tonal" size="lg" className="h-12" disabled={!newWorkerName.trim() || addWorker.isPending} onClick={handleAddWorker}>{t('common.add')}</Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </Sheet>
  );
};
