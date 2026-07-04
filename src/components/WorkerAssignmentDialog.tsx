import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Check, X } from '@phosphor-icons/react';
import { useAddWorker } from '@/data/queries';
import { validateSplit } from '@/domain/money';
import type { Worker } from '@/domain/types';

interface WorkerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Worker[];
  selectedWorkers: string[];
  workerAmounts: Record<string, string>;
  totalAmount: number;
  onWorkersChange: (selectedWorkers: string[], workerAmounts: Record<string, string>) => void;
}

export const WorkerAssignmentDialog = ({
  open,
  onOpenChange,
  workers,
  selectedWorkers: initialSelectedWorkers,
  workerAmounts: initialWorkerAmounts,
  totalAmount,
  onWorkersChange,
}: WorkerAssignmentDialogProps) => {
  const addWorker = useAddWorker();
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initialSelectedWorkers);
  const [workerAmounts, setWorkerAmounts] = useState<Record<string, string>>(initialWorkerAmounts);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  useEffect(() => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
  }, [initialSelectedWorkers, initialWorkerAmounts, open]);

  const getSortedWorkers = () => {
    const recentWorkers: string[] = JSON.parse(localStorage.getItem('recentWorkers') || '[]');
    return [...workers].sort((a, b) => {
      // Основна працівниця завжди перша
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const aIndex = recentWorkers.indexOf(a.id);
      const bIndex = recentWorkers.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  };

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers(prev => {
      if (prev.includes(workerId)) {
        const newAmounts = { ...workerAmounts };
        delete newAmounts[workerId];
        setWorkerAmounts(newAmounts);
        return prev.filter(id => id !== workerId);
      }
      const newSelected = [...prev, workerId];
      if (newSelected.length === 1) {
        setWorkerAmounts({ [workerId]: totalAmount.toString() });
      } else {
        setWorkerAmounts(prev => ({ ...prev, [workerId]: '0' }));
      }
      return newSelected;
    });
  };

  const handleAmountChange = (workerId: string, value: string) => {
    const newAmount = parseFloat(value) || 0;
    const updatedAmounts = { ...workerAmounts, [workerId]: value };

    if (selectedWorkers.length > 1) {
      const firstWorkerId = selectedWorkers[0];
      if (!firstWorkerId) return;

      let sumOfOthers = 0;
      selectedWorkers.forEach(id => {
        if (id !== firstWorkerId) {
          const amount = id === workerId ? newAmount : (parseFloat(updatedAmounts[id] || '0') || 0);
          sumOfOthers += amount;
        }
      });

      if (sumOfOthers > totalAmount) {
        sumOfOthers = totalAmount;
        updatedAmounts[workerId] = totalAmount.toString();
      }

      updatedAmounts[firstWorkerId] = Math.max(0, totalAmount - sumOfOthers).toString();
    } else if (newAmount > totalAmount) {
      updatedAmounts[workerId] = totalAmount.toString();
    }

    setWorkerAmounts(updatedAmounts);
  };

  const handleAddWorker = () => {
    const name = newWorkerName.trim();
    if (!name) return;
    addWorker.mutate(
      { name, makePrimary: workers.length === 0 },
      {
        onSuccess: (worker) => {
          localStorage.setItem('lastAddedWorker', worker.id);
          setNewWorkerName('');
          setIsAddingWorker(false);
        },
      },
    );
  };

  const split = validateSplit(
    totalAmount,
    selectedWorkers.map((id) => ({ workerId: id, amount: parseFloat(workerAmounts[id] || '0') })),
  );

  const handleConfirm = () => {
    onWorkersChange(selectedWorkers, workerAmounts);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] p-0 gap-0 rounded-3xl">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="display text-xl text-center mb-3">Розподіл між працівницями</h2>
          <div className="stat-tile stat-tile-ok justify-center rounded-2xl p-3 text-center flex-col gap-1">
            <div className="caption-label">Загальна сума</div>
            <div className="display text-2xl text-success">{totalAmount}€</div>
            {selectedWorkers.length > 0 && (
              <div className="text-xs mt-1 text-muted-foreground">
                Залишок: <span className={`font-bold ${Math.abs(split.remainder) < 0.01 ? 'text-success' : 'text-warning'}`}>{Math.round(split.remainder)}€</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">
              Оберіть працівниць
            </label>

            <div className="relative mb-3">
              <div className="overflow-x-auto flex gap-2 pb-1 scrollbar-hide">
                {getSortedWorkers()
                  .filter(w => !selectedWorkers.includes(w.id))
                  .map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => toggleWorker(worker.id)}
                      className="px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-2 bg-secondary text-secondary-foreground border border-border whitespace-nowrap hover:bg-muted transition-colors flex-shrink-0"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: worker.color }} />
                      {worker.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex justify-center">
              {!isAddingWorker ? (
                <button
                  onClick={() => setIsAddingWorker(true)}
                  className="w-full px-4 py-2.5 rounded-full border-2 border-dashed border-success/50 flex items-center justify-center gap-2 bg-success/8 hover:bg-success/12 transition-colors"
                >
                  <Plus className="w-4 h-4 text-success" />
                  <span className="text-sm font-bold text-success">Додати нову працівницю</span>
                </button>
              ) : (
                <div className="w-full px-3 py-2 rounded-full border-2 border-success bg-success/8 flex items-center gap-2">
                  <Input
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="Введіть ім'я"
                    className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddWorker();
                      if (e.key === 'Escape') {
                        setIsAddingWorker(false);
                        setNewWorkerName('');
                      }
                    }}
                  />
                  <button
                    onClick={handleAddWorker}
                    disabled={!newWorkerName.trim() || addWorker.isPending}
                    className="w-8 h-8 rounded-full bg-success flex items-center justify-center hover:bg-success/90 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-success-foreground" />
                  </button>
                  <button
                    onClick={() => { setIsAddingWorker(false); setNewWorkerName(''); }}
                    className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-destructive-foreground" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {selectedWorkers.length > 0 && (
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">
                Розподіліть суми
              </label>

              <div className="space-y-2">
                {selectedWorkers.map(workerId => {
                  const worker = workers.find(w => w.id === workerId);
                  if (!worker) return null;

                  return (
                    <div key={workerId} className="bg-secondary/60 rounded-2xl p-3 border border-border">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWorker(workerId)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border-2"
                          style={{
                            backgroundColor: worker.color,
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)'
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-white/80" />
                          {worker.name}
                        </button>

                        <button
                          onClick={() => toggleWorker(workerId)}
                          className="w-6 h-6 rounded-full bg-destructive hover:bg-destructive/90 flex items-center justify-center transition-colors flex-shrink-0"
                          title="Видалити"
                        >
                          <X className="w-3 h-3 text-destructive-foreground" />
                        </button>

                        <div className="flex items-center gap-1 ml-auto">
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={workerAmounts[workerId] || ''}
                            onChange={(e) => handleAmountChange(workerId, e.target.value)}
                            onFocus={(e) => {
                              if (workerAmounts[workerId] === '0' || !workerAmounts[workerId]) {
                                setWorkerAmounts(prev => ({ ...prev, [workerId]: '' }));
                              } else {
                                e.target.select();
                              }
                            }}
                            className="h-9 text-center font-bold w-20"
                            maxLength={4}
                          />
                          <span className="text-sm font-bold text-muted-foreground">€</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedWorkers.length > 0 && !split.valid && (
            <div className="bg-warning/10 border-l-4 border-warning p-2.5 rounded-lg">
              <p className="text-xs font-bold text-warning">
                {split.remainder > 0
                  ? `Залишилось розподілити ${Math.round(split.remainder)}€`
                  : split.remainder < 0
                    ? `Сума перевищує загальну на ${Math.abs(Math.round(split.remainder))}€`
                    : 'Введіть суму для кожної працівниці'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Скасувати
            </Button>
            <Button
              variant="default"
              disabled={!split.valid}
              onClick={handleConfirm}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            >
              Підтвердити
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
