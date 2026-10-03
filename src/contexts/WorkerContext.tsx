import { useAuth } from "@/contexts/AuthContext";
import { safeStorage } from "@/lib/storage";
import { isDemo } from "@/data/mode";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Клієнтський стан: обрана працівниця (фільтр перегляду).
 * Список працівниць — серверний стан, живе в useWorkers() (React Query).
 */

interface WorkerFilterContextType {
  selectedWorkerId: string | "all";
  setSelectedWorkerId: (id: string | "all") => void;
}

const WorkerFilterContext = createContext<WorkerFilterContextType | undefined>(undefined);

export const useWorkerFilter = () => {
  const ctx = useContext(WorkerFilterContext);
  if (!ctx) throw new Error("useWorkerFilter must be used within WorkerProvider");
  return ctx;
};

export const WorkerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const storageKey = `aria-worker:${isDemo ? 'demo' : user?.id ?? 'guest'}`;
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | "all">(
    () => safeStorage.getItem(storageKey) || "all",
  );

  useEffect(() => {
    safeStorage.setItem(storageKey, selectedWorkerId);
  }, [selectedWorkerId, storageKey]);

  return (
    <WorkerFilterContext.Provider value={{ selectedWorkerId, setSelectedWorkerId }}>
      {children}
    </WorkerFilterContext.Provider>
  );
};
