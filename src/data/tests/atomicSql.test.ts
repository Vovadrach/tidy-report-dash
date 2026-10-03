import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const clientA = '31111111-1111-4111-8111-111111111111';
const clientB = '32222222-2222-4222-8222-222222222222';
const workerA = '41111111-1111-4111-8111-111111111111';
const workerB = '42222222-2222-4222-8222-222222222222';
let seq = 100;
const id = () => `51111111-1111-4111-8111-${String(seq++).padStart(12,'0')}`;
const entry = (over = {}) => ({ requestId: id(),clientId: clientA,clientName: 'Клієнт А',date: '2026-10-03',hours: 1,amount: 12.5,paidAmount: 0,status: 'unpaid',isPlanned: false,assignments: [{ workerId: workerA,hours: 1,amount: 12.5 }],...over });
const call = async (name: string, values: unknown[]) => {
  const result = await db.query<{ result: unknown }>(`select public.${name}(${values.map((_,i) => `$${i+1}`).join(',')}) result`,values.map(v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v));
  return result.rows[0].result as { work_days: Array<{ id: string; amount: number; day_paid_amount: number; payment_status: string; work_day_assignments: Array<{ amount: number; hours: number }> }> };
};
const owner = async (user: string) => { await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[user]); };

beforeAll(async () => {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role authenticated; create role anon;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated;`);
  for (const path of ['supabase-schema.sql','supabase-workers-migration.sql','add-is-planned-column.sql','update-worker-deletion-behavior.sql']) {
    let source = await readFile(`supabase/legacy/${path}`,'utf8');
    source = source.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";','').replace(/uuid_generate_v4\(\)/g,'gen_random_uuid()');
    await db.exec(source);
  }
  await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;
    insert into auth.users values('${A}'),('${B}');
    insert into clients(id,user_id,name,hourly_rate) values('${clientA}','${A}','Клієнт А',12.5),('${clientB}','${B}','Клієнт Б',20);
    insert into workers(id,user_id,name,color,is_primary) values('${workerA}','${A}','Оксана','#4f8f83',true),('${workerB}','${B}','Ірина','#4f8f83',true);`);
  await db.exec(await readFile('supabase/migrations/0004_legacy_atomic_operations.sql','utf8'));
  await db.exec('set role authenticated');
  await owner(A);
},30_000);
afterAll(() => db.close());

describe('атомарні операції PostgreSQL з реальною RLS', () => {
  it('зберігає години, оплату і призначення разом; повтор не дублює запис', async () => {
    const value = entry({ paidAmount: 4.25 });
    const first = await call('aria_save_entry',[value,null]);
    expect(first.work_days[0]).toMatchObject({ id: value.requestId,amount: 12.5,day_paid_amount: 4.25,payment_status: 'partial' });
    await call('aria_save_entry',[value,null]);
    const count = await db.query<{ count: number }>('select count(*)::int count from work_days where id=$1',[value.requestId]);
    expect(count.rows[0].count).toBe(1);
  });
  it('не залишає report чи день після збою призначень', async () => {
    const value = entry({ assignments: [{ workerId: workerB,hours: 1,amount: 12.5 }] });
    await expect(call('aria_save_entry',[value,null])).rejects.toThrow();
    const result = await db.query<{ count: number }>('select count(*)::int count from reports where id=$1',[value.requestId]);
    expect(result.rows[0].count).toBe(0);
  });
  it('відхиляє змінені дані з тим самим ключем повторної операції', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await expect(call('aria_save_entry',[{ ...value,amount: 25 },null])).rejects.toThrow();
  });
  it('перетворює план на роботу з вибраною оплатою в одній операції', async () => {
    const value = entry({ hours: 0,amount: 0,isPlanned: true,assignments: [] });
    await call('aria_save_entry',[value,null]);
    const result = await call('aria_save_entry',[entry({ paidAmount: 12.5 }),value.requestId]);
    expect(result.work_days[0]).toMatchObject({ amount: 12.5,day_paid_amount: 12.5,payment_status: 'paid' });
  });
  it('зміна нотатки зберігає старі гроші та частки', async () => {
    const value = entry({ amount: 13.75,assignments: [{ workerId: workerA,hours: 1,amount: 13.75 }] });
    await call('aria_save_entry',[value,null]);
    const result = await call('aria_update_day',[value.requestId,{ note: 'Оновлено' },null]);
    expect(result.work_days[0].amount).toBe(13.75);
    expect(result.work_days[0].work_day_assignments[0].amount).toBe(13.75);
  });
  it('перераховує частки й статус, не втрачаючи історичної оплати', async () => {
    const value = entry({ paidAmount: 12.5 }); await call('aria_save_entry',[value,null]);
    const result = await call('aria_update_day',[value.requestId,{ hours: 2,amount: 25 },null]);
    expect(result.work_days[0]).toMatchObject({ day_paid_amount: 12.5,payment_status: 'partial',amount: 25 });
    expect(result.work_days[0].work_day_assignments[0]).toMatchObject({ amount: 25,hours: 2 });
    await expect(call('aria_update_day',[value.requestId,{ amount: 10 },null])).rejects.toThrow();
  });
  it('додавання оплати повторюється без подвійного списання', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]); const operation = id();
    await call('aria_add_payment',[value.requestId,0.1,operation]);
    const result = await call('aria_add_payment',[value.requestId,0.1,operation]);
    expect(result.work_days[0].day_paid_amount).toBe(0.1);
    await expect(call('aria_add_payment',[value.requestId,20,id()])).rejects.toThrow();
  });
  it('масова оплата повністю скасовується при чужому записі', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await expect(call('aria_set_payments',[[{ dayId: value.requestId,status: 'paid' },{ dayId: id(),status: 'paid' }]])).rejects.toThrow();
    const result = await call('aria_day_json',[value.requestId]);
    expect(result.work_days[0].day_paid_amount).toBe(0);
  });
  it('інший акаунт не читає, не змінює і не оплачує чужі записи', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]); await owner(B);
    try {
      expect(await call('aria_day_json',[value.requestId])).toBeNull();
      await expect(call('aria_update_day',[value.requestId,{ note: 'Чужа зміна' },null])).rejects.toThrow();
      await expect(call('aria_add_payment',[value.requestId,1,id()])).rejects.toThrow();
      await expect(call('aria_save_entry',[entry(),null])).rejects.toThrow();
    } finally { await owner(A); }
  });
  it('видаляє тільки обраний день багатоденного старого звіту', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]); const second = id();
    await db.query(`insert into work_days(id,report_id,date,hours,amount,payment_status,day_paid_amount,is_planned) values($1,$2,'2026-10-04',1,10,'unpaid',0,false)`,[second,value.requestId]);
    await call('aria_delete_day',[value.requestId]);
    const rows = await db.query('select id from work_days where report_id=$1',[value.requestId]);
    expect(rows.rows).toEqual([{ id: second }]);
    await call('aria_delete_day',[second]);
    const reports = await db.query('select id from reports where id=$1',[value.requestId]);
    expect(reports.rows).toEqual([]);
  });
});

describe('граничні сценарії SQL', () => {
  it('повтор завершення плану не скидає оплату, додану пізніше', async () => {
    const plan = entry({ hours: 0,amount: 0,isPlanned: true,assignments: [] });
    await call('aria_save_entry',[plan,null]);
    const completed = entry();
    await call('aria_save_entry',[completed,plan.requestId]);
    await call('aria_add_payment',[plan.requestId,4.25,id()]);
    const result = await call('aria_save_entry',[completed,plan.requestId]);
    expect(result.work_days[0].day_paid_amount).toBe(4.25);
    await expect(call('aria_save_entry',[entry(),plan.requestId])).rejects.toThrow();
  });
  it('зберігає погоджену ставку навіть після зміни ціни клієнта', async () => {
    const value = entry({ hourlyRate: 12.5, hours: 1/6, amount: 2.08, assignments: [{ workerId: workerA, hours: 1/6, amount: 2.08 }] });
    await call('aria_save_entry',[value,null]);
    await db.query('update clients set hourly_rate=20 where id=$1',[clientA]);
    const result = await call('aria_day_json',[value.requestId]);
    expect(result.work_days[0]).toMatchObject({ rate_snapshot: 12.5,amount: 2.08 });
    await call('aria_save_entry',[value,null]);
  });
  it.each(['2026-02-30','2026-1-03'])('відхиляє дату %s без часткового запису', async date => {
    const value = entry({ date }); await expect(call('aria_save_entry',[value,null])).rejects.toThrow();
    expect((await db.query('select id from reports where id=$1',[value.requestId])).rows).toEqual([]);
  });
  it('відхиляє повтор зі зміненими призначеннями', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await expect(call('aria_save_entry',[{ ...value,assignments: [] },null])).rejects.toThrow();
  });
  it('не стирає призначення при помилці їх заміни', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await expect(call('aria_update_day',[value.requestId,{},[{ workerId: workerB,amount: 12.5,hours: 1 }]])).rejects.toThrow();
    const result = await call('aria_day_json',[value.requestId]); expect(result.work_days[0].work_day_assignments).toHaveLength(1);
  });
  it('повна оплата використовує актуальну суму на сервері', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await call('aria_update_day',[value.requestId,{ amount: 25,hours: 2 },null]);
    await call('aria_set_payments',[[{ dayId: value.requestId,status: 'paid',paidAmount: 12.5 }]]);
    expect((await call('aria_day_json',[value.requestId])).work_days[0].day_paid_amount).toBe(25);
  });
  it('два різні платежі накопичуються, а переплата не проходить', async () => {
    const value = entry(); await call('aria_save_entry',[value,null]);
    await Promise.all([call('aria_add_payment',[value.requestId,4.25,id()]),call('aria_add_payment',[value.requestId,5.5,id()])]);
    expect((await call('aria_day_json',[value.requestId])).work_days[0].day_paid_amount).toBe(9.75);
    await expect(call('aria_add_payment',[value.requestId,3,id()])).rejects.toThrow();
  });
  it('захищає зв’язок чужого клієнта навіть при прямому записі у таблицю', async () => {
    await expect(db.query(`insert into reports(id,user_id,client_id,client_name,date,status,payment_status,total_hours,total_earned,paid_amount,remaining_amount) values($1,$2,$3,'Чужий','2026-10-03','in_progress','unpaid',1,10,0,10)`,[id(),A,clientB])).rejects.toThrow();
  });
  it('після видалення працівниці зберігає історію сум та ім’я', async () => {
    const worker = await call('aria_add_worker',[{ name: 'Тимчасова',color: '#4f8f83' }]) as unknown as { id: string };
    const value = entry({ assignments: [{ workerId: worker.id,amount: 12.5,hours: 1 }] });
    await call('aria_save_entry',[value,null]); await db.query('delete from workers where id=$1',[worker.id]);
    const rows = await db.query('select worker_id,deleted_worker_name,amount::float8 amount from work_day_assignments where work_day_id=$1',[value.requestId]);
    expect(rows.rows[0]).toMatchObject({ worker_id: null,deleted_worker_name: 'Тимчасова',amount: 12.5 });
  });
});
