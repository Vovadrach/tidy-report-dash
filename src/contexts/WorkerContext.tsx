import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Worker } from '@/types/report';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

interface WorkerContextType {
  workers: Worker[];
  selectedWorkerId: string | 'all';
  selectedWorker: Worker | null;
  setSelectedWorkerId: (id: string | 'all') => void;
  loadWorkers: () => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'user_id' | 'created_at'>) => Promise<Worker>;
  updateWorker: (workerId: string, updates: Partial<Worker>) => Promise<Worker>;
  deleteWorker: (workerId: string) => Promise<void>;
  loading: boolean;
}

const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

export const useWorker = () => {
  const context = useContext(WorkerContext);
  if (!context) {
    throw new Error('useWorker must be used within WorkerProvider');
  }
  return context;
};

export const WorkerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  // Initialize from localStorage or default to 'all'
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>(() => {
    const saved = localStorage.getItem('selectedWorkerId');
    return saved || 'all';
  });
  const [loading, setLoading] = useState(true);

  const loadWorkers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Ensure primary worker exists
      await api.ensurePrimaryWorker();
      
      // Load all workers
      const data = await api.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id' | 'user_id' | 'created_at'>) => {
    const newWorker = await api.addWorker(worker);
    setWorkers(prev => [...prev, newWorker]);
    return newWorker;
  };

  const updateWorker = async (workerId: string, updates: Partial<Worker>) => {
    const updatedWorker = await api.updateWorker(workerId, updates);
    setWorkers(prev => prev.map(w => w.id === workerId ? updatedWorker : w));
    return updatedWorker;
  };

  const deleteWorker = async (workerId: string) => {
    await api.deleteWorker(workerId);
    setWorkers(prev => prev.filter(w => w.id !== workerId));
    
    // If deleted worker was selected, switch to 'all'
    if (selectedWorkerId === workerId) {
      setSelectedWorkerId('all');
    }
  };

  const selectedWorker = selectedWorkerId === 'all' 
    ? null 
    : workers.find(w => w.id === selectedWorkerId) || null;

  useEffect(() => {
    if (user) {
      loadWorkers();
    }
  }, [user]);

  // Save selected worker to localStorage
  useEffect(() => {
    if (selectedWorkerId) {
      localStorage.setItem('selectedWorkerId', selectedWorkerId);
    }
  }, [selectedWorkerId]);

  return (
    <WorkerContext.Provider
      value={{
        workers,
        selectedWorkerId,
        selectedWorker,
        setSelectedWorkerId,
        loadWorkers,
        addWorker,
        updateWorker,
        deleteWorker,
        loading,
      }}
    >
      {children}
    </WorkerContext.Provider>
  );
};
