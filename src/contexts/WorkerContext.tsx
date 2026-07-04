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
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | "all">(
    () => localStorage.getItem("selectedWorkerId") || "all",
  );

  useEffect(() => {
    localStorage.setItem("selectedWorkerId", selectedWorkerId);
  }, [selectedWorkerId]);

  return (
    <WorkerFilterContext.Provider value={{ selectedWorkerId, setSelectedWorkerId }}>
      {children}
    </WorkerFilterContext.Provider>
  );
};
