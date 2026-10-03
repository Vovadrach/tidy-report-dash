import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NewAssignment, NewWorkEntry, PaymentStatus, WorkDay, WorkDayPatch } from '@/domain/types';
import { resolveStatus } from '@/domain/money';
import { backend, isDemo } from './index';

export const keys = { workDays: ['workDays'] as const, clients: ['clients'] as const, workers: ['workers'] as const };
export const useWorkDays = () => useQuery({ queryKey: keys.workDays, queryFn: ({ signal }) => backend.fetchWorkDays(signal), staleTime: 60_000 });
export const useClients = () => useQuery({ queryKey: keys.clients, queryFn: ({ signal }) => backend.fetchClients(signal), staleTime: 5 * 60_000, refetchOnWindowFocus: false });
export const useWorkers = () => useQuery({ queryKey: keys.workers, queryFn: ({ signal }) => backend.fetchWorkers(signal), staleTime: 5 * 60_000, refetchOnWindowFocus: false });

export const upsertWorkDays = (client: QueryClient, updated: WorkDay[]) => {
  if (client.getQueryData(keys.workDays) === undefined) { void client.invalidateQueries({ queryKey: keys.workDays }); return; }
  client.setQueryData<WorkDay[]>(keys.workDays, previous => {
  const replacements = new Map(updated.map(day => [day.id,day]));
  const rows = (previous ?? []).map(day => {
    const row = replacements.get(day.id); replacements.delete(day.id); return row ?? day;
  });
  return [...rows,...replacements.values()].sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  });
};
const messageOf = (error: unknown) => error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Перевірте інтернет і повторіть спробу.';
const reportError = (title: string, error: unknown) => toast.error(title,{ description: messageOf(error) });

/** A queued write belongs to the account that submitted it. */
const useOwnerFence = () => {
  const { user } = useAuth();
  const owner = user?.id;
  return async <R,>(write: () => Promise<R>): Promise<R> => {
    if (!isDemo) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!owner || session?.user.id !== owner) throw new Error('Акаунт змінився. Відкрийте запис і повторіть дію.');
    }
    return write();
  };
};

/** One write queue prevents a slow earlier request from overwriting a newer edit. */
const useDayWrite = <T,>(mutationFn: (input: T) => Promise<WorkDay>, title: string) => {
  const client = useQueryClient();
  const ownedWrite = useOwnerFence();
  return useMutation({
    mutationFn: (input: T) => ownedWrite(() => mutationFn(input)), scope: { id: 'workDays-write' }, networkMode: 'always', retry: false,
    onMutate: () => client.cancelQueries({ queryKey: keys.workDays }),
    onSuccess: async day => { await client.cancelQueries({ queryKey: keys.workDays }); upsertWorkDays(client,[day]); },
    onError: error => { reportError(title,error); void client.invalidateQueries({ queryKey: keys.workDays }); },
  });
};
export const useSetPayment = () => useDayWrite((input: { dayId: string; status: PaymentStatus; paidAmount: number }) => backend.setPayment(input.dayId,input),'Не вдалося оновити оплату');
export const useAddPayment = () => useDayWrite((input: { dayId: string; amount: number; operationId: string }) => backend.addPayment(input.dayId,input.amount,input.operationId),'Не вдалося додати оплату');
export const useUpdateWorkDayFields = () => useDayWrite((input: { dayId: string; patch: WorkDayPatch }) => backend.updateWorkDayFields(input.dayId,input.patch),'Не вдалося зберегти зміни');
export const useCreateWorkEntry = () => useDayWrite((entry: NewWorkEntry) => backend.createWorkEntry(entry),'Не вдалося створити запис');
export const useSaveWorkEntry = () => useDayWrite((input: { dayId: string; entry: NewWorkEntry }) => backend.saveWorkEntry(input.dayId,input.entry),'Не вдалося оновити запис');
export const useReplaceAssignments = () => useDayWrite((input: { dayId: string; assignments: NewAssignment[] }) => backend.replaceAssignments(input.dayId,input.assignments),'Не вдалося оновити працівниць');
export const useMarkAllPaid = () => {
  const client = useQueryClient();
  const ownedWrite = useOwnerFence();
  return useMutation({
    mutationFn: (days: Array<Pick<WorkDay,'id'|'amount'>>) => ownedWrite(() => backend.markAllPaid(days)),
    scope: { id: 'workDays-write' }, networkMode: 'always', retry: false,
    onMutate: () => client.cancelQueries({ queryKey: keys.workDays }),
    onSuccess: async days => { await client.cancelQueries({ queryKey: keys.workDays }); upsertWorkDays(client,days); toast.success(`Оплачено ${days.length} записів`); },
    onError: error => { reportError('Не вдалося оновити оплати',error); void client.invalidateQueries({ queryKey: keys.workDays }); },
  });
};
const useDeleteDays = (mutationFn: (id: string) => Promise<void>, matches: (day: WorkDay,id: string) => boolean) => {
  const client = useQueryClient();
  const ownedWrite = useOwnerFence();
  return useMutation({
    mutationFn: (id: string) => ownedWrite(() => mutationFn(id)), scope: { id: 'workDays-write' }, networkMode: 'always', retry: false,
    onMutate: () => client.cancelQueries({ queryKey: keys.workDays }),
    onSuccess: async (_,id) => {
      await client.cancelQueries({ queryKey: keys.workDays });
      client.setQueryData<WorkDay[]>(keys.workDays,days => days?.filter(day => !matches(day,id)));
      toast.success('Запис видалено');
    },
    onError: error => { reportError('Не вдалося видалити запис',error); void client.invalidateQueries({ queryKey: keys.workDays }); },
  });
};
export const useDeleteWorkDay = () => useDeleteDays(id => backend.deleteWorkDay(id),(day,id) => day.id === id);

const useEntityWrite = <T,R,>(mutationFn: (input: T) => Promise<R>, title: string, success: string, invalidate: readonly (readonly string[])[]) => {
  const client = useQueryClient();
  const ownedWrite = useOwnerFence();
  return useMutation({ mutationFn: (input: T) => ownedWrite(() => mutationFn(input)), networkMode: 'always', retry: false,
    onSuccess: () => { toast.success(success); for (const queryKey of invalidate) void client.invalidateQueries({ queryKey }); },
    onError: error => reportError(title,error),
  });
};
export const useAddClient = () => useEntityWrite((input: { name: string; hourlyRate: number }) => backend.addClient(input),'Не вдалося додати клієнта','Клієнта додано',[keys.clients]);
export const useUpdateClient = () => useEntityWrite((input: { id: string; name: string; hourlyRate: number }) => backend.updateClient(input.id,input),'Не вдалося оновити клієнта','Клієнта оновлено',[keys.clients,keys.workDays]);
export const useDeleteClient = () => {
  const client = useQueryClient();
  const mutation = useEntityWrite((id: string) => backend.deleteClient(id),'Не вдалося видалити клієнта','Клієнта видалено',[keys.clients,keys.workDays]);
  return { ...mutation, mutate: (id: string, options?: Parameters<typeof mutation.mutate>[1]) => mutation.mutate(id,{
    ...options,
    onSuccess: (data,variables,result,context) => {
      client.setQueryData<WorkDay[]>(keys.workDays,rows => rows?.filter(day => day.clientId !== id));
      options?.onSuccess?.(data,variables,result,context);
    },
  }) };
};
const WORKER_COLORS = ['#4f8f83','#8f6f4f','#5f7fa8','#a86f8a','#6f8f5a','#8a7fb8'];
export const useAddWorker = () => useEntityWrite((input: { name: string; makePrimary?: boolean }) => backend.addWorker({
  name: input.name,color: WORKER_COLORS[Math.floor(Math.random()*WORKER_COLORS.length)],isPrimary: input.makePrimary ?? false,
}),'Не вдалося додати працівницю','Працівницю додано',[keys.workers]);
export const useDeleteWorker = () => useEntityWrite((id: string) => backend.deleteWorker(id),'Не вдалося видалити працівницю','Працівницю видалено',[keys.workers,keys.workDays]);
