import {
  useMutation, useQuery, useQueryClient, type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  NewAssignment, NewWorkEntry, PaymentStatus, WorkDay,
} from "@/domain/types";
import type { Allocation } from "@/domain/money";
import { backend } from "./index";

/** Ключі кешу (V3-SPEC §7). */
export const keys = {
  workDays: ["workDays"] as const,
  clients: ["clients"] as const,
  workers: ["workers"] as const,
};

// ---------- Читання ----------

export const useWorkDays = () =>
  useQuery({
    queryKey: keys.workDays,
    queryFn: backend.fetchWorkDays,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

export const useClients = () =>
  useQuery({
    queryKey: keys.clients,
    queryFn: backend.fetchClients,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export const useWorkers = () =>
  useQuery({
    queryKey: keys.workers,
    queryFn: backend.fetchWorkers,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

// ---------- Оптимістичні мутації робочих днів ----------

interface DaysSnapshot {
  previous: WorkDay[] | undefined;
}

const optimisticDays = async (
  qc: QueryClient,
  update: (days: WorkDay[]) => WorkDay[],
): Promise<DaysSnapshot> => {
  await qc.cancelQueries({ queryKey: keys.workDays });
  const previous = qc.getQueryData<WorkDay[]>(keys.workDays);
  if (previous) qc.setQueryData(keys.workDays, update(previous));
  return { previous };
};

const rollback = (qc: QueryClient, ctx: DaysSnapshot | undefined) => {
  if (ctx?.previous) qc.setQueryData(keys.workDays, ctx.previous);
};

const mutationErrorToast = (message: string) => (error: unknown) => {
  console.error(error);
  toast.error(message, { description: "Зміни скасовано. Спробуй ще раз." });
};

export const useSetPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dayId: string; status: PaymentStatus; paidAmount: number }) =>
      backend.setPayment(input.dayId, input),
    onMutate: (input) =>
      optimisticDays(qc, (days) =>
        days.map((d) =>
          d.id === input.dayId
            ? { ...d, status: input.status, paidAmount: input.paidAmount }
            : d,
        ),
      ),
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося оновити оплату")(e);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

/** Пакетне «оплачено всі». */
export const useMarkAllPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: Array<Pick<WorkDay, "id" | "amount">>) => {
      await Promise.all(
        days.map((d) =>
          backend.setPayment(d.id, { status: "paid", paidAmount: d.amount }),
        ),
      );
    },
    onMutate: (targets) => {
      const ids = new Set(targets.map((t) => t.id));
      return optimisticDays(qc, (days) =>
        days.map((d) =>
          ids.has(d.id) ? { ...d, status: "paid", paidAmount: d.amount } : d,
        ),
      );
    },
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося оновити оплати")(e);
    },
    onSuccess: (_d, targets) => toast.success(`Оплачено ${targets.length} записів`),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

/** Прийняти оплату як набір алокацій (PaymentSheet, розподіл на дні). */
export const useApplyAllocations = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allocs: Allocation[]) => {
      await Promise.all(
        allocs.map((a) => backend.setPayment(a.id, { status: a.status, paidAmount: a.paidAmount })),
      );
    },
    onMutate: (allocs) => {
      const map = new Map(allocs.map((a) => [a.id, a]));
      return optimisticDays(qc, (days) =>
        days.map((d) => {
          const a = map.get(d.id);
          return a ? { ...d, status: a.status, paidAmount: a.paidAmount } : d;
        }),
      );
    },
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося зберегти оплату")(e);
    },
    onSuccess: (_d, allocs) => toast.success(`Оплата прийнята · ${allocs.length} дн.`),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

export const useUpdateWorkDayFields = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      dayId: string;
      patch: { date?: string; hours?: number; amount?: number; note?: string | null; isPlanned?: boolean };
    }) => backend.updateWorkDayFields(input.dayId, input.patch),
    onMutate: ({ dayId, patch }) =>
      optimisticDays(qc, (days) =>
        days.map((d) =>
          d.id === dayId
            ? {
                ...d,
                date: patch.date ?? d.date,
                hours: patch.hours ?? d.hours,
                amount: patch.amount ?? d.amount,
                note: patch.note === undefined ? d.note : patch.note ?? undefined,
                isPlanned: patch.isPlanned ?? d.isPlanned,
              }
            : d,
        ),
      ),
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося зберегти зміни")(e);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

export const useDeleteWorkDay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => backend.deleteWorkDay(dayId),
    onMutate: (dayId) =>
      optimisticDays(qc, (days) => days.filter((d) => d.id !== dayId)),
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося видалити запис")(e);
    },
    onSuccess: () => toast.success("Запис видалено"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

/** Перехідне: у старій схемі день видаляється разом із report-обгорткою. */
export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => backend.deleteReport(reportId),
    onMutate: (reportId) =>
      optimisticDays(qc, (days) => days.filter((d) => d.reportId !== reportId)),
    onError: (e, _v, ctx) => {
      rollback(qc, ctx);
      mutationErrorToast("Не вдалося видалити запис")(e);
    },
    onSuccess: () => toast.success("Запис видалено"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

export const useCreateWorkEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: NewWorkEntry) => backend.createWorkEntry(entry),
    onError: mutationErrorToast("Не вдалося створити запис"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

export const useReplaceAssignments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dayId: string; assignments: NewAssignment[] }) =>
      backend.replaceAssignments(input.dayId, input.assignments),
    onError: mutationErrorToast("Не вдалося оновити працівниць"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workDays }),
  });
};

// ---------- Клієнти ----------

export const useAddClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; hourlyRate: number }) => backend.addClient(input),
    onError: mutationErrorToast("Не вдалося додати клієнта"),
    onSuccess: () => toast.success("Клієнта додано"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.clients }),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string; hourlyRate: number }) =>
      backend.updateClient(input.id, input),
    onError: mutationErrorToast("Не вдалося оновити клієнта"),
    onSuccess: () => toast.success("Клієнта оновлено"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.clients });
      qc.invalidateQueries({ queryKey: keys.workDays });
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteClient(id),
    onError: mutationErrorToast("Не вдалося видалити клієнта"),
    onSuccess: () => toast.success("Клієнта видалено"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.clients });
      qc.invalidateQueries({ queryKey: keys.workDays });
    },
  });
};

// ---------- Працівниці ----------

const WORKER_COLORS = ["#4f8f83", "#8f6f4f", "#5f7fa8", "#a86f8a", "#6f8f5a", "#8a7fb8"];

export const useAddWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; makePrimary?: boolean }) => {
      const color = WORKER_COLORS[Math.floor(Math.random() * WORKER_COLORS.length)];
      return backend.addWorker({
        name: input.name,
        color,
        isPrimary: input.makePrimary ?? false,
      });
    },
    onError: mutationErrorToast("Не вдалося додати працівницю"),
    onSuccess: () => toast.success("Працівницю додано"),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.workers }),
  });
};

export const useDeleteWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteWorker(id),
    onError: mutationErrorToast("Не вдалося видалити працівницю"),
    onSuccess: () => toast.success("Працівницю видалено"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.workers });
      qc.invalidateQueries({ queryKey: keys.workDays });
    },
  });
};
