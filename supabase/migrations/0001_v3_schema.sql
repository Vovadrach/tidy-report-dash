-- ============================================================
-- v3 «Aria»: нова модель даних (V3-SPEC §6.1)
-- Центр обліку — робочий день; агрегати — view.
-- Застосовується через Supabase SQL editor або `supabase db push`.
-- ============================================================

-- 0. Клієнти: м'яка архівація
alter table public.clients
  add column if not exists archived_at timestamptz;

-- 1. Робочі дні v3
create table if not exists public.work_days_v3 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  hours numeric(6,2) not null default 0,
  amount numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid'
    check (payment_status in ('paid','partial','unpaid')),
  paid_amount numeric(10,2) not null default 0,
  is_planned boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists work_days_v3_user_date_idx
  on public.work_days_v3 (user_id, date desc);
create index if not exists work_days_v3_client_idx
  on public.work_days_v3 (client_id);

-- 2. Призначення працівниць v3
create table if not exists public.work_day_assignments_v3 (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references public.work_days_v3(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  deleted_worker_name text,
  hours numeric(6,2) not null default 0,
  amount numeric(10,2) not null default 0
);

create index if not exists wda_v3_work_day_idx
  on public.work_day_assignments_v3 (work_day_id);
create index if not exists wda_v3_worker_idx
  on public.work_day_assignments_v3 (worker_id);

-- 3. RLS
alter table public.work_days_v3 enable row level security;
alter table public.work_day_assignments_v3 enable row level security;

drop policy if exists work_days_v3_owner on public.work_days_v3;
create policy work_days_v3_owner on public.work_days_v3
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wda_v3_owner on public.work_day_assignments_v3;
create policy wda_v3_owner on public.work_day_assignments_v3
  for all using (
    exists (select 1 from public.work_days_v3 wd
            where wd.id = work_day_id and wd.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.work_days_v3 wd
            where wd.id = work_day_id and wd.user_id = auth.uid())
  );

-- 4. В'ю агрегатів (security_invoker: RLS базових таблиць діє)
create or replace view public.client_balances
  with (security_invoker = true) as
select
  user_id,
  client_id,
  sum(amount) filter (where not is_planned)                          as total_earned,
  sum(hours)  filter (where not is_planned)                          as total_hours,
  coalesce(sum(least(paid_amount, amount)), 0)                       as total_paid,
  coalesce(sum(amount - least(paid_amount, amount))
             filter (where payment_status <> 'paid' and not is_planned), 0) as total_due,
  coalesce(sum(hours * (1 - least(paid_amount, amount) / nullif(amount, 0)))
             filter (where payment_status <> 'paid' and not is_planned), 0) as unpaid_hours
from public.work_days_v3
group by user_id, client_id;

create or replace view public.monthly_summary
  with (security_invoker = true) as
select
  user_id,
  date_trunc('month', date)::date as month,
  sum(hours)  as hours,
  sum(amount) as earned,
  coalesce(sum(least(paid_amount, amount)), 0) as paid
from public.work_days_v3
where not is_planned
group by user_id, 2;

-- R-2 (рішення): інваріант payment_status ← paid_amount/amount тримає
-- доменна функція resolveStatus() у застосунку (єдина точка запису).
-- Тригер НЕ створюється, щоб уникнути двох джерел правди.
