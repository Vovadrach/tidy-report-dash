import { useState, useEffect, useRef } from 'react';
import { useWorker } from '@/contexts/WorkerContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { CaretDown as ChevronDown, Plus, Check, X, Trash as Trash2, Warning as AlertTriangle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const WorkerSelector = () => {
  const { workers, selectedWorkerId, setSelectedWorkerId, loading, addWorker, deleteWorker, loadWorkers } = useWorker();
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key or click outside
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

  if (loading) return null;

  const selectedWorker = selectedWorkerId === 'all'
    ? null
    : workers.find(w => w.id === selectedWorkerId);

  const selectedWorkerName = selectedWorkerId === 'all'
    ? 'Всі'
    : selectedWorker?.name || 'Всі';

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) {
      toast.error('Введіть ім\'я працівника');
      return;
    }

    try {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      await addWorker({
        name: newWorkerName.trim(),
        color: randomColor,
        is_primary: false
      });
      
      setNewWorkerName('');
      setIsAddingWorker(false);
      toast.success('Працівника додано');
    } catch (error) {
      toast.error('Помилка додавання працівника');
      console.error(error);
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;

    try {
      await deleteWorker(workerToDelete);
      setWorkerToDelete(null);
      toast.success('Працівника видалено');

      // If deleted worker was selected, switch to "all"
      if (selectedWorkerId === workerToDelete) {
        setSelectedWorkerId('all');
      }
    } catch (error) {
      toast.error('Помилка видалення працівника');
      console.error(error);
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsRemoving(true);
    try {
      const result = await api.removeDuplicateWorkers('Лідія');

      if (result.success) {
        toast.success(result.message);
        // Reload workers to reflect changes
        await loadWorkers();
        setIsOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Помилка видалення дублікатів');
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full dock rounded-full px-5 py-2.5 transition-all duration-150 active:scale-95 relative"
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

      {/* Glassmorphism Panel - Expands upward from button */}
      <div
        ref={panelRef}
        className={`absolute left-0 right-0 bottom-full mb-2 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="dock rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {/* Remove Duplicates Button */}
              {workers.filter(w => w.name.toLowerCase().includes('лідія')).length > 1 && (
                <>
                  <button
                    onClick={handleRemoveDuplicates}
                    disabled={isRemoving}
                    className="w-full p-3 rounded-xl bg-warning/10 hover:bg-warning/15 border border-warning/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-xs font-bold text-warning">
                        {isRemoving ? 'Видалення...' : 'Видалити дублікати Лідія'}
                      </span>
                    </div>
                  </button>
                  <div className="h-px bg-border/70 my-1" />
                </>
              )}

              {/* Add Worker Section */}
              {isAddingWorker ? (
                <div className="p-3 rounded-xl bg-success/10 border border-success/25">
                  <div className="flex gap-2">
                    <Input
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      placeholder="Ім'я працівника"
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
                      onClick={() => {
                        setIsAddingWorker(false);
                        setNewWorkerName('');
                      }}
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
                    <span className="text-xs font-bold text-success">Додати працівника</span>
                  </div>
                </button>
              )}

              <div className="h-px bg-border/70 my-1" />

              {/* All option */}
              <button
                onClick={() => {
                  setSelectedWorkerId('all');
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                  selectedWorkerId === 'all'
                    ? 'bg-secondary border-2 border-border shadow-sm'
                    : 'bg-card/50 hover:bg-secondary/60 border border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0 bg-muted-foreground/50"
                  />
                  <span className={`text-sm font-bold flex-1 text-left ${
                    selectedWorkerId === 'all' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    Всі
                  </span>
                </div>
              </button>

              <div className="h-px bg-border/70 my-1" />

              {/* Workers list */}
              {workers.map(worker => (
                <div key={worker.id} className="relative">
                  <button
                    onClick={() => {
                      setSelectedWorkerId(worker.id);
                      setIsOpen(false);
                    }}
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
                      {worker.is_primary && (
                        <span className="text-xs text-muted-foreground font-medium">(основний)</span>
                      )}
                    </div>
                  </button>

                  {!worker.is_primary && (
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
            <AlertDialogTitle>Видалити працівника?</AlertDialogTitle>
            <AlertDialogDescription>
              Це назавжди видалить працівника та всі пов'язані записи робочих днів. Цю дію неможливо скасувати.
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
