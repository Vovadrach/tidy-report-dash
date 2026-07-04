import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { CaretDown as ChevronDown, Plus, Check, X, Trash as Trash2 } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { useAddWorker, useDeleteWorker, useWorkers } from "@/data/queries";

export const WorkerSelector = () => {
  const { selectedWorkerId, setSelectedWorkerId } = useWorkerFilter();
  const { data: workers = [], isLoading } = useWorkers();
  const addWorker = useAddWorker();
  const deleteWorker = useDeleteWorker();

  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsAddingWorker(false);
        setNewWorkerName('');
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && panelRef.current && buttonRef.current) {
        const target = e.target as Node;
        if (!panelRef.current.contains(target) && !buttonRef.current.contains(target)) {
          setIsOpen(false);
          setIsAddingWorker(false);
          setNewWorkerName('');
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) return null;

  const selectedWorker = selectedWorkerId === 'all'
    ? null
    : workers.find(w => w.id === selectedWorkerId);

  const selectedWorkerName = selectedWorker?.name ?? 'Всі';

  const handleAddWorker = () => {
    const name = newWorkerName.trim();
    if (!name) {
      toast.error("Введіть ім'я працівниці");
      return;
    }
    // Онбординг (R-5): перша додана працівниця стає основною
    addWorker.mutate(
      { name, makePrimary: workers.length === 0 },
      {
        onSuccess: () => {
          setNewWorkerName('');
          setIsAddingWorker(false);
        },
      },
    );
  };

  const handleDeleteWorker = () => {
    if (!workerToDelete) return;
    deleteWorker.mutate(workerToDelete, {
      onSuccess: () => {
        if (selectedWorkerId === workerToDelete) setSelectedWorkerId('all');
        setWorkerToDelete(null);
      },
    });
  };

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full dock-light rounded-full px-5 py-2.5 transition-all duration-150 active:scale-95 relative"
        style={
          selectedWorker
            ? { background: `linear-gradient(135deg, ${selectedWorker.color}26, ${selectedWorker.color}4d)` }
            : undefined
        }
      >
        <div className="flex items-center justify-center gap-2 text-foreground/80">
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            {selectedWorkerName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div
        ref={panelRef}
        className={`absolute left-0 right-0 bottom-full mb-2 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="dock-light rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {isAddingWorker ? (
              <div className="p-3 rounded-xl bg-success/10 border border-success/25">
                <div className="flex gap-2">
                  <Input
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="Ім'я працівниці"
                    className="h-9 text-sm rounded-lg border-success/40 bg-card focus-visible:ring-success"
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
                    className="h-9 w-9 rounded-lg bg-success hover:bg-success/90 text-success-foreground flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsAddingWorker(false); setNewWorkerName(''); }}
                    className="h-9 w-9 rounded-lg bg-card hover:bg-secondary border border-border flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingWorker(true)}
                className="w-full p-3 rounded-xl bg-success/8 hover:bg-success/12 border border-success/25 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4 text-success" />
                  <span className="text-xs font-bold text-success">Додати працівницю</span>
                </div>
              </button>
            )}

            <div className="h-px bg-border/70 my-1" />

            <button
              onClick={() => { setSelectedWorkerId('all'); setIsOpen(false); }}
              className={`w-full p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                selectedWorkerId === 'all'
                  ? 'bg-secondary border-2 border-border shadow-sm'
                  : 'bg-card/50 hover:bg-secondary/60 border border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0 bg-muted-foreground/50" />
                <span className={`text-sm font-bold flex-1 text-left ${
                  selectedWorkerId === 'all' ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  Всі
                </span>
              </div>
            </button>

            <div className="h-px bg-border/70 my-1" />

            {workers.map(worker => (
              <div key={worker.id} className="relative">
                <button
                  onClick={() => { setSelectedWorkerId(worker.id); setIsOpen(false); }}
                  className={`w-full p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                    selectedWorkerId === worker.id
                      ? 'bg-primary/12 border-2 border-primary/40 shadow-sm'
                      : 'bg-card/50 hover:bg-secondary/60 border border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                      style={{ backgroundColor: worker.color }}
                    />
                    <span className={`text-sm font-bold flex-1 text-left ${
                      selectedWorkerId === worker.id ? 'text-primary' : 'text-foreground'
                    }`}>
                      {worker.name}
                    </span>
                    {worker.isPrimary && (
                      <span className="text-xs text-muted-foreground font-medium">(основна)</span>
                    )}
                  </div>
                </button>

                {!worker.isPrimary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkerToDelete(worker.id);
                      setIsOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-destructive/15 text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={!!workerToDelete} onOpenChange={(open) => !open && setWorkerToDelete(null)}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити працівницю?</AlertDialogTitle>
            <AlertDialogDescription>
              Її призначення в записах збережуться з поміткою «видалена». Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWorkerToDelete(null)}>
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorker}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
