import { fetchAllPages, fetchCursorPages } from './pagination';
import { supabase } from '@/lib/supabase';
import type { Backend } from './backend';
import { legacyBackend } from './backend.legacy';
import { mapClient, mapReportRowToWorkDays, mapWorkDayRow, mapWorker } from './mappers';
import { clientInput, validateEntry, validatePatch, workerInput } from '@/domain/validation';
import { applyPartialPayment, resolveStatus, round2 } from '@/domain/money';
import { patchWorkDay } from '@/domain/workDay';
import type { WorkDay, WorkDayPatch } from '@/domain/types';

const DAY_SELECT = `id,date,hours,amount,payment_status,day_paid_amount,is_planned,note,
  report:reports!inner(id,client_id,client_name,user_id,client:clients(name)),
  work_day_assignments(id,worker_id,hours,amount,deleted_worker_name,worker:workers(id,name,color,is_primary))`;
const uid = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Потрібен вхід');
  return session.user.id;
};
const assertOnline = () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Немає інтернету. Підключіться й повторіть збереження.');
};
const daySelection = async () => (await atomicReady()) ? `${DAY_SELECT},rate_snapshot` : DAY_SELECT;
const readDay = async (id: string): Promise<WorkDay> => {
  const { data, error } = await supabase.from('work_days').select(await daySelection()).eq('id', id).single();
  if (error) throw error;
  return mapWorkDayRow(data);
};
const rpcDay = async (name: string, input: Record<string, unknown>): Promise<WorkDay> => {
  const { data, error } = await supabase.rpc(name, input);
  if (error) throw error;
  const day = mapReportRowToWorkDays(data)[0];
  if (!day) throw new Error('Запис не знайдено');
  return day;
};
let protocol: Promise<boolean> | undefined;
/** Only a missing function enables compatibility mode; network/permission errors fail visibly. */
const atomicReady = () => protocol ??= (async () => {
  const { error } = await supabase.rpc('aria_day_json', { p_day_id: '00000000-0000-0000-0000-000000000000' });
  if (error?.code === 'PGRST202') return false;
  if (error) { protocol = undefined; throw error; }
  return true;
})();
const restoreDay = async (day: WorkDay) => {
  await legacyBackend.updateWorkDayFields(day.id, { date: day.date, hours: day.hours, amount: day.amount, note: day.note ?? null, isPlanned: day.isPlanned });
  await legacyBackend.setPayment(day.id, { status: day.status, paidAmount: day.paidAmount });
  const { error: removeError } = await supabase.from('work_day_assignments').delete().eq('work_day_id', day.id);
  if (removeError) throw removeError;
  if (day.assignments.length) {
    const { error } = await supabase.from('work_day_assignments').insert(day.assignments.map(a => ({
      id: a.id, work_day_id: day.id, worker_id: a.workerId, hours: a.hours, amount: a.amount,
      deleted_worker_name: a.workerId ? null : a.workerName,
    })));
    if (error) throw error;
  }
};
const syncLegacyReport = async (day: WorkDay) => {
  const data = await fetchAllPages((from,to) => supabase.from('work_days').select('hours,amount,day_paid_amount,date').eq('report_id',day.reportId).order('id').range(from,to));
  const amount = round2((data ?? []).reduce((n,d) => n + d.amount, 0));
  const paid = round2((data ?? []).reduce((n,d) => n + d.day_paid_amount, 0));
  const { error: updateError } = await supabase.from('reports').update({
    total_hours: (data ?? []).reduce((n,d) => n + d.hours, 0), total_earned: amount,
    paid_amount: paid, remaining_amount: round2(amount - paid), payment_status: resolveStatus(paid, amount),
    ...(data?.length ? { date: data.map(d => d.date).sort()[0] } : {}),
  }).eq('id', day.reportId);
  if (updateError) throw updateError;
};
const legacyChange = async (day: WorkDay, save: () => Promise<unknown>) => {
  try { await save(); await syncLegacyReport(day); return await readDay(day.id); }
  catch (error) {
    try { await restoreDay(day); await syncLegacyReport(day); }
    catch { throw new Error('Не вдалося підтвердити збереження. Оновіть дані й перевірте запис.'); }
    throw error;
  }
};

export const supabaseBackend: Backend = {
  ...legacyBackend,
  async fetchWorkDays(signal) {
    const owner = await uid();
    const select = await daySelection();
    return (await fetchCursorPages<{ id: string; date: string }>((after,size) => {
      const query = supabase.from('work_days').select(select).eq('report.user_id',owner).order('date',{ ascending: false }).order('id').limit(size);
      if (after) query.or(`date.lt.${after.date},and(date.eq.${after.date},id.gt.${after.id})`);
      return (signal ? query.abortSignal(signal) : query).overrideTypes<Array<{ id: string; date: string }>, { merge: false }>();
    }, signal)).map(mapWorkDayRow);
  },
  async fetchClients(signal) {
    const owner = await uid();
    return (await fetchCursorPages<{ id: string; created_at: string; name: string; hourly_rate: number }>((after,size) => {
      const query = supabase.from('clients').select('id,name,hourly_rate,created_at').eq('user_id',owner).order('created_at',{ ascending: false }).order('id').limit(size);
      if (after) query.or(`created_at.lt.${after.created_at},and(created_at.eq.${after.created_at},id.gt.${after.id})`);
      return signal ? query.abortSignal(signal) : query;
    }, signal)).map(mapClient);
  },
  async fetchWorkers(signal) {
    const owner = await uid();
    return (await fetchCursorPages<{ id: string; created_at: string; name: string; color: string; is_primary: boolean }>((after,size) => {
      const query = supabase.from('workers').select('id,name,color,is_primary,created_at').eq('user_id',owner).order('created_at').order('id').limit(size);
      if (after) query.or(`created_at.gt.${after.created_at},and(created_at.eq.${after.created_at},id.gt.${after.id})`);
      return signal ? query.abortSignal(signal) : query;
    }, signal)).map(mapWorker);
  },
  async createWorkEntry(input) {
    assertOnline();
    const entry = validateEntry({ ...input, requestId: input.requestId ?? crypto.randomUUID() });
    if (await atomicReady()) return rpcDay('aria_save_entry', { p_entry: entry });
    const { data: existing, error: findError } = await supabase.from('work_days').select(DAY_SELECT).eq('id',entry.requestId!).maybeSingle();
    if (findError) throw findError;
    if (existing) return mapWorkDayRow(existing);
    try { await legacyBackend.createWorkEntry(entry); return await readDay(entry.requestId!); }
    catch (error) { try { await legacyBackend.deleteReport(entry.requestId!); } catch { /* Readback reveals uncertain writes. */ } throw error; }
  },
  async saveWorkEntry(dayId,input) {
    assertOnline();
    const entry = validateEntry(input);
    if (await atomicReady()) return rpcDay('aria_save_entry', { p_entry: entry, p_day_id: dayId });
    const before = await readDay(dayId);
    return legacyChange(before,async () => {
      await legacyBackend.updateWorkDayFields(dayId,{ date: entry.date, hours: entry.hours, amount: entry.amount, note: entry.note ?? null, isPlanned: entry.isPlanned });
      await legacyBackend.replaceAssignments(dayId,entry.assignments);
      await legacyBackend.setPayment(dayId,{ status: entry.status, paidAmount: entry.paidAmount });
    });
  },
  async updateWorkDayFields(dayId,input: WorkDayPatch) {
    assertOnline();
    const patch = validatePatch(input);
    if (await atomicReady()) return rpcDay('aria_update_day',{ p_day_id: dayId, p_patch: patch });
    const before = await readDay(dayId);
    const next = patchWorkDay(before,patch);
    return legacyChange(before,async () => {
      await legacyBackend.updateWorkDayFields(dayId,patch);
      await legacyBackend.setPayment(dayId,{ status: next.status, paidAmount: next.paidAmount });
      if (next.assignments !== before.assignments) {
        for (const a of next.assignments) {
          const { error } = await supabase.from('work_day_assignments').update({ hours: a.hours,amount: a.amount }).eq('id',a.id);
          if (error) throw error;
        }
      }
    });
  },
  async setPayment(dayId,payment) {
    assertOnline();
    if (await atomicReady()) {
      const { data,error } = await supabase.rpc('aria_set_payments',{ p_payments: [{ dayId,...payment }] });
      if (error) throw error;
      return mapReportRowToWorkDays(data[0])[0];
    }
    const before = await readDay(dayId);
    const paidAmount = payment.status === 'paid' ? before.amount : payment.status === 'unpaid' ? 0 : round2(payment.paidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > before.amount) throw new Error('Некоректна оплата');
    return legacyChange(before,() => legacyBackend.setPayment(dayId,{ paidAmount,status: resolveStatus(paidAmount,before.amount) }));
  },
  async addPayment(dayId,amount,operationId) {
    assertOnline();
    if (await atomicReady()) return rpcDay('aria_add_payment', { p_day_id: dayId,p_amount: amount,p_operation_id: operationId });
    const before = await readDay(dayId);
    const result = applyPartialPayment(before,amount);
    if (!result.ok) throw new Error(result.error === 'exceeds' ? 'Сума перевищує залишок' : 'Введіть коректну суму');
    return legacyChange(before,() => legacyBackend.setPayment(dayId,result));
  },
  async markAllPaid(days) {
    assertOnline();
    if (await atomicReady()) {
      const { data,error } = await supabase.rpc('aria_set_payments',{ p_payments: days.map(day => ({ dayId: day.id,status: 'paid' })) });
      if (error) throw error;
      return (data as unknown[]).flatMap(mapReportRowToWorkDays);
    }
    const result: PromiseSettledResult<WorkDay>[] = [];
    for (let index = 0; index < days.length; index += 4) {
      result.push(...await Promise.allSettled(days.slice(index,index + 4).map(day => this.setPayment(day.id,{ status: 'paid',paidAmount: day.amount }))));
    }
    if (result.some(item => item.status === 'rejected')) throw new Error('Деякі оплати не збережено. Перевірте оновлений список.');
    return result.map(item => (item as PromiseFulfilledResult<WorkDay>).value);
  },
  async replaceAssignments(dayId,assignments) {
    assertOnline();
    if (await atomicReady()) return rpcDay('aria_update_day',{ p_day_id: dayId,p_patch: {},p_assignments: assignments });
    const before = await readDay(dayId);
    return legacyChange(before,() => legacyBackend.replaceAssignments(dayId,assignments));
  },
  async deleteWorkDay(dayId) {
    assertOnline();
    if (await atomicReady()) {
      const { error } = await supabase.rpc('aria_delete_day',{ p_day_id: dayId });
      if (error) throw error;
      return;
    }
    const day = await readDay(dayId);
    await legacyBackend.deleteWorkDay(dayId);
    const { count,error } = await supabase.from('work_days').select('id',{ count: 'exact',head: true }).eq('report_id',day.reportId);
    if (error) throw error;
    if (count === 0) await legacyBackend.deleteReport(day.reportId);
    else await syncLegacyReport(day);
  },
  async addClient(input) { assertOnline(); await legacyBackend.addClient(clientInput.parse(input)); },
  async updateClient(id,input) { assertOnline(); await legacyBackend.updateClient(id,clientInput.parse(input)); },
  async deleteClient(id) { assertOnline(); await legacyBackend.deleteClient(id); },
  async addWorker(input) {
    assertOnline(); const worker = workerInput.parse(input);
    if (!(await atomicReady())) return legacyBackend.addWorker(worker);
    const { data,error } = await supabase.rpc('aria_add_worker',{ p_worker: worker });
    if (error) throw error;
    return mapWorker(data);
  },
  async deleteWorker(id) { assertOnline(); await legacyBackend.deleteWorker(id); },
};
