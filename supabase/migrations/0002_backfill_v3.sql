-- ============================================================
-- v3 backfill: reports/work_days → work_days_v3 (V3-SPEC §6.2)
-- ЗАПУСКАТИ ПІСЛЯ 0001. Старі таблиці НЕ видаляються (архів).
-- Ідемпотентно: повторний запуск не дублює (перевірка по id).
-- ============================================================

begin;

insert into public.work_days_v3
  (id, user_id, client_id, date, hours, amount,
   payment_status, paid_amount, is_planned, note, created_at)
select
  wd.id,
  r.user_id,
  r.client_id,
  wd.date::date,
  coalesce(wd.hours, 0),
  coalesce(wd.amount, 0),
  coalesce(wd.payment_status, 'unpaid'),
  coalesce(wd.day_paid_amount, 0),
  coalesce(wd.is_planned, false),
  wd.note,
  wd.created_at
from public.work_days wd
join public.reports r on r.id = wd.report_id
on conflict (id) do nothing;

insert into public.work_day_assignments_v3
  (id, work_day_id, worker_id, deleted_worker_name, hours, amount)
select a.id, a.work_day_id, a.worker_id, a.deleted_worker_name,
       coalesce(a.hours, 0), coalesce(a.amount, 0)
from public.work_day_assignments a
where exists (select 1 from public.work_days_v3 v where v.id = a.work_day_id)
on conflict (id) do nothing;

commit;

-- ================== КОНТРОЛЬНІ СУМИ ==================
-- Обидва селекти мають повернути ІДЕНТИЧНІ рядки.
select 'old' as src, r.user_id, count(*) n,
       round(sum(wd.amount)::numeric, 2) amount,
       round(sum(wd.day_paid_amount)::numeric, 2) paid
from public.work_days wd join public.reports r on r.id = wd.report_id
group by r.user_id
union all
select 'new', user_id, count(*),
       round(sum(amount)::numeric, 2),
       round(sum(paid_amount)::numeric, 2)
from public.work_days_v3
group by user_id
order by 2, 1;
