import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Check, X } from 'lucide-react';
import { Worker } from '@/types/report';

interface WorkerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Worker[];
  selectedWorkers: string[];
  workerAmounts: Record<string, string>;
  totalAmount: number;
  onWorkersChange: (selectedWorkers: string[], workerAmounts: Record<string, string>) => void;
  onAddWorker: (name: string) => Promise<void>;
}

export const WorkerAssignmentDialog = ({
  open,
  onOpenChange,
  workers,
  selectedWorkers: initialSelectedWorkers,
  workerAmounts: initialWorkerAmounts,
  totalAmount,
  onWorkersChange,
  onAddWorker,
}: WorkerAssignmentDialogProps) => {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initialSelectedWorkers);
  const [workerAmounts, setWorkerAmounts] = useState<Record<string, string>>(initialWorkerAmounts);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  useEffect(() => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
  }, [initialSelectedWorkers, initialWorkerAmounts, open]);

  const getSortedWorkers = () => {
    const recentWorkers = JSON.parse(localStorage.getItem('recentWorkers') || '[]');
    const lastAdded = localStorage.getItem('lastAddedWorker');

    return [...workers].sort((a, b) => {
      // "Лідія" завжди на першому місці
      if (a.name === 'Лідія') return -1;
      if (b.name === 'Лідія') return 1;

      // Останній доданий працівник на другому місці (відразу після Лідії)
      if (lastAdded) {
        if (a.id === lastAdded) return -1;
        if (b.id === lastAdded) return 1;
      }

      // Решта сортується за частотою використання
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
      } else {
        const newSelected = [...prev, workerId];

        if (newSelected.length === 1) {
          setWorkerAmounts({ [workerId]: totalAmount.toString() });
        } else {
          setWorkerAmounts(prev => ({ ...prev, [workerId]: '0' }));
        }

        return newSelected;
      }
    });
  };

  const handleAmountChange = (workerId: string, value: string) => {
    try {
      const newAmount = parseFloat(value) || 0;
      const updatedAmounts = { ...workerAmounts, [workerId]: value };

      if (selectedWorkers.length > 1) {
        const firstWorkerId = selectedWorkers[0];
        if (!firstWorkerId) return;

        // Підраховуємо суму всіх інших працівників (крім першого)
        let sumOfOthers = 0;
        selectedWorkers.forEach(id => {
          if (id !== firstWorkerId) {
            const amount = id === workerId ? newAmount : (parseFloat(updatedAmounts[id] || '0') || 0);
            sumOfOthers += amount;
          }
        });

        // Обмежуємо суму інших працівників до totalAmount
        if (sumOfOthers > totalAmount) {
          sumOfOthers = totalAmount;
          updatedAmounts[workerId] = totalAmount.toString();
        }

        // Автоматично оновлюємо суму першого працівника
        const remainingForFirst = totalAmount - sumOfOthers;
        updatedAmounts[firstWorkerId] = Math.max(0, remainingForFirst).toString();
      } else {
        // Якщо тільки один працівник
        if (newAmount > totalAmount) {
          updatedAmounts[workerId] = totalAmount.toString();
        }
      }

      setWorkerAmounts(updatedAmounts);
    } catch (error) {
      console.error('Error changing amount:', error);
    }
  };

  const handleAddWorker = async () => {
    if (newWorkerName.trim()) {
      await onAddWorker(newWorkerName.trim());

      // Зберігаємо ID останнього доданого працівника
      // Знаходимо щойно доданого працівника за ім'ям
      setTimeout(() => {
        const newWorker = workers.find(w => w.name === newWorkerName.trim());
        if (newWorker) {
          localStorage.setItem('lastAddedWorker', newWorker.id);
        }
      }, 100);

      setNewWorkerName('');
      setIsAddingWorker(false);
    }
  };

  const getTotalAssignedAmount = () => {
    return selectedWorkers.reduce((sum, workerId) => {
      return sum + (parseFloat(workerAmounts[workerId] || '0') || 0);
    }, 0);
  };

  const getRemainingAmount = () => {
    return totalAmount - getTotalAssignedAmount();
  };

  const isValid = () => {
    try {
      if (selectedWorkers.length === 0) return true;
      const assignedAmount = getTotalAssignedAmount();
      if (Math.abs(assignedAmount - totalAmount) > 0.01) return false;
      for (const workerId of selectedWorkers) {
        const amount = parseFloat(workerAmounts[workerId] || '0');
        if (amount === 0 || isNaN(amount)) return false;
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  const handleConfirm = () => {
    try {
      onWorkersChange(selectedWorkers, workerAmounts);
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming worker assignment:', error);
    }
  };

  const handleCancel = () => {
    setSelectedWorkers(initialSelectedWorkers);
    setWorkerAmounts(initialWorkerAmounts);
    onOpenChange(false);
  };

  const remainingAmount = getRemainingAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-center mb-3">Розподіл працівників</h2>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <div className="text-sm text-muted-foreground mb-1">Загальна сума</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalAmount}€</div>
            {selectedWorkers.length > 0 && (
              <div className="text-xs mt-2 text-muted-foreground">
                Залишок: <span className={remainingAmount === 0 ? 'text-green-600' : 'text-orange-600'}>{Math.round(remainingAmount)}€</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Worker Selection - Horizontal Scroll */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">
              Оберіть працівників
            </label>

            <div className="relative mb-3">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

              <div
                className="overflow-x-auto flex gap-2 pb-1"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <style>
                  {`
                    .overflow-x-auto::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>

                {getSortedWorkers()
                  .filter(w => !selectedWorkers.includes(w.id))
                  .map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => toggleWorker(worker.id)}
                      className="px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: worker.color }}
                      />
                      {worker.name}
                    </button>
                  ))}
              </div>

              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            </div>

            {/* Add Worker Button - окремо */}
            <div className="flex justify-center">
              {!isAddingWorker ? (
                <button
                  onClick={() => setIsAddingWorker(true)}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-green-500/60 flex items-center justify-center gap-2 bg-green-50/50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Додати нового працівника</span>
                </button>
              ) : (
                <div className="w-full px-3 py-2 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/50 flex items-center gap-2">
                  <Input
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="Введіть ім'я працівника"
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
                    disabled={!newWorkerName.trim()}
                    className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingWorker(false);
                      setNewWorkerName('');
                    }}
                    className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected Workers with Amount Input */}
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
                    <div key={workerId} className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 border">
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
                          className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                          title="Видалити"
                        >
                          <X className="w-3 h-3 text-white" />
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
                            placeholder=""
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

          {/* Validation Message */}
          {selectedWorkers.length > 0 && !isValid() && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500 p-2 rounded">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                {remainingAmount > 0
                  ? `Залишилось розподілити ${Math.round(remainingAmount)}€`
                  : `Сума перевищує загальну на ${Math.abs(Math.round(remainingAmount))}€`
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Скасувати
            </Button>
            <Button
              variant="default"
              disabled={!isValid()}
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Підтвердити
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
