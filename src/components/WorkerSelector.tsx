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
import { ChevronDown, Plus, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const WorkerSelector = () => {
  const { workers, selectedWorkerId, setSelectedWorkerId, loading, addWorker, deleteWorker } = useWorker();
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative w-full">
      {/* Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full backdrop-blur-xl border border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.15),0_8px_24px_0_rgba(0,0,0,0.1)] rounded-full px-5 py-2.5 transition-all duration-150 active:scale-95 relative"
        style={{
          background: selectedWorker
            ? `linear-gradient(135deg, ${selectedWorker.color}30, ${selectedWorker.color}50)`
            : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className="text-sm font-bold tracking-[-0.01em] whitespace-nowrap"
            style={{ color: '#3C3C43' }}
          >
            {selectedWorkerName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: '#3C3C43' }}
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
        <div
          className="rounded-3xl overflow-hidden shadow-[0_-4px_32px_rgba(0,0,0,0.12),0_-2px_16px_rgba(0,0,0,0.08)] border border-white/20"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {/* Add Worker Section */}
              {isAddingWorker ? (
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50/60 border border-green-200/40">
                  <div className="flex gap-2">
                    <Input
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      placeholder="Ім'я працівника"
                      className="h-9 text-sm rounded-lg border-green-300/50 bg-white/80 backdrop-blur-sm focus-visible:ring-green-400"
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
                      className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingWorker(false);
                        setNewWorkerName('');
                      }}
                      className="h-9 w-9 rounded-lg bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingWorker(true)}
                  className="w-full p-3 rounded-xl bg-gradient-to-br from-green-50/60 to-emerald-50/40 hover:from-green-100/70 hover:to-emerald-100/50 border border-green-200/30 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700">Додати працівника</span>
                  </div>
                </button>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent my-1" />

              {/* All option */}
              <button
                onClick={() => {
                  setSelectedWorkerId('all');
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                  selectedWorkerId === 'all'
                    ? 'bg-gradient-to-br from-gray-100 to-gray-200/80 border-2 border-gray-300/60 shadow-md'
                    : 'bg-white/40 hover:bg-white/60 border border-gray-200/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0 bg-gray-400"
                  />
                  <span className={`text-sm font-bold flex-1 text-left ${
                    selectedWorkerId === 'all' ? 'text-gray-700' : 'text-gray-600'
                  }`}>
                    Всі
                  </span>
                </div>
              </button>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent my-1" />

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
                        ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-blue-400/40 shadow-md'
                        : 'bg-white/40 hover:bg-white/60 border border-gray-200/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                        style={{ backgroundColor: worker.color }}
                      />
                      <span className={`text-sm font-bold flex-1 text-left ${
                        selectedWorkerId === worker.id ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {worker.name}
                      </span>
                      {worker.is_primary && (
                        <span className="text-xs text-gray-500 font-medium">(основний)</span>
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-500/20 text-red-600 transition-colors"
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
        <AlertDialogContent className="bg-card border border-border">
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
