-- Aria 3.1: atomic operations for the ACTIVE legacy schema. Independent of v3 backfill.
-- The frontend detects these functions automatically. Everything runs with caller RLS.
begin;
alter table public.work_days add column if not exists rate_snapshot numeric(10,2);
alter table public.work_days alter column hours type numeric(12,6);
alter table public.work_day_assignments alter column hours type numeric(12,6);
alter table public.reports alter column total_hours type numeric(12,6);

create index if not exists aria_days_date_id on public.work_days(date desc,id);
create index if not exists aria_reports_owner on public.reports(user_id,id);
create index if not exists aria_clients_owner_created on public.clients(user_id,created_at desc,id);
create index if not exists aria_workers_owner_created on public.workers(user_id,created_at,id);

-- NOT VALID preserves legacy rows while guarding all future writes.
alter table public.work_days drop constraint if exists aria_day_financial_bounds;
alter table public.work_days add constraint aria_day_financial_bounds check (
  (rate_snapshot is null or rate_snapshot > 0 and rate_snapshot <= 99999999.99 and rate_snapshot::text <> 'NaN') and
  hours >= 0 and hours <= 100.999999 and hours::text <> 'NaN' and
  amount >= 0 and amount <= 99999999.99 and amount::text <> 'NaN' and
  day_paid_amount >= 0 and day_paid_amount <= amount and day_paid_amount::text <> 'NaN'
) not valid;

create table if not exists public.aria_payment_operations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.work_days(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
alter table public.aria_payment_operations enable row level security;
drop policy if exists aria_payment_owner on public.aria_payment_operations;
create policy aria_payment_owner on public.aria_payment_operations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists(
    select 1 from public.work_days d join public.reports r on r.id = d.report_id
    where d.id = day_id and r.user_id = auth.uid()
  ));
grant select, insert on public.aria_payment_operations to authenticated;

create table if not exists public.aria_entry_operations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.work_days(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.aria_entry_operations enable row level security;
drop policy if exists aria_entry_owner on public.aria_entry_operations;
create policy aria_entry_owner on public.aria_entry_operations for all using(user_id = auth.uid()) with check (
  user_id = auth.uid() and exists(select 1 from public.work_days d join public.reports r on r.id = d.report_id
    where d.id = day_id and r.user_id = auth.uid())
);
grant select,insert on public.aria_entry_operations to authenticated;

-- Close foreign-key ownership gaps present in the original policies.
drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports" on public.reports for insert with check (
  user_id = auth.uid() and exists(select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
);
drop policy if exists "Users can update their own reports" on public.reports;
create policy "Users can update their own reports" on public.reports for update using(user_id = auth.uid()) with check (
  user_id = auth.uid() and exists(select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
);
drop policy if exists "Users can insert assignments to their work_days" on public.work_day_assignments;
create policy "Users can insert assignments to their work_days" on public.work_day_assignments for insert with check (
  exists(select 1 from public.work_days d join public.reports r on r.id = d.report_id where d.id = work_day_id and r.user_id = auth.uid())
  and (worker_id is null or exists(select 1 from public.workers w where w.id = worker_id and w.user_id = auth.uid()))
);
drop policy if exists "Users can update assignments of their work_days" on public.work_day_assignments;
create policy "Users can update assignments of their work_days" on public.work_day_assignments for update using (
  exists(select 1 from public.work_days d join public.reports r on r.id = d.report_id where d.id = work_day_id and r.user_id = auth.uid())
) with check (
  exists(select 1 from public.work_days d join public.reports r on r.id = d.report_id where d.id = work_day_id and r.user_id = auth.uid())
  and (worker_id is null or exists(select 1 from public.workers w where w.id = worker_id and w.user_id = auth.uid()))
);

create or replace function public.aria_day_json(p_day_id uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object('id',r.id,'client_id',r.client_id,'client_name',coalesce(c.name,r.client_name),
    'work_days',jsonb_build_array(to_jsonb(d) || jsonb_build_object('work_day_assignments',coalesce((
      select jsonb_agg(to_jsonb(a) || jsonb_build_object('worker',to_jsonb(w)) order by a.id)
      from public.work_day_assignments a left join public.workers w on w.id = a.worker_id where a.work_day_id = d.id
    ),'[]'::jsonb))))
  from public.work_days d join public.reports r on r.id = d.report_id left join public.clients c on c.id = r.client_id
  where d.id = p_day_id and r.user_id = auth.uid();
$$;

create or replace function public.aria_sync_report(p_report_id uuid) returns void
language sql security invoker set search_path = public as $$
  update public.reports r set total_hours = x.hours, total_earned = x.amount,
    paid_amount = x.paid, remaining_amount = x.amount - x.paid, date = coalesce(x.date,r.date),
    payment_status = case when x.paid <= 0 then 'unpaid' when x.paid >= x.amount then 'paid' else 'partial' end
  from (select coalesce(sum(hours),0) hours,coalesce(sum(amount),0) amount,
    coalesce(sum(day_paid_amount),0) paid,min(date) date from public.work_days where report_id = p_report_id) x
  where r.id = p_report_id and r.user_id = auth.uid();
$$;

create or replace function public.aria_update_day(p_day_id uuid, p_patch jsonb, p_assignments jsonb default null) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  d public.work_days; n_amount numeric; n_hours numeric; n_paid numeric; n_rate numeric; n_planned boolean; a jsonb;
begin
  if auth.uid() is null then raise exception 'Потрібен вхід'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),1);
  if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Некоректні зміни'; end if;
  if p_patch ? 'date' and (p_patch->>'date' is null or p_patch->>'date' !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$') then
    raise exception 'Оберіть коректну дату';
  end if;
  select wd.* into d from public.work_days wd join public.reports r on r.id = wd.report_id
    where wd.id = p_day_id and r.user_id = auth.uid() for update of wd;
  if not found then raise exception 'Запис не знайдено або немає доступу'; end if;
  if length(p_patch->>'note') > 10000 then raise exception 'Нотатка надто довга'; end if;
  n_amount := round(coalesce((p_patch->>'amount')::numeric,d.amount),2);
  n_hours := coalesce((p_patch->>'hours')::numeric,d.hours);
  n_paid := round(coalesce((p_patch->>'paidAmount')::numeric,d.day_paid_amount),2);
  n_rate := round(coalesce((p_patch->>'hourlyRate')::numeric,d.rate_snapshot),2);
  if n_rate is not null and (n_rate::text = 'NaN' or n_rate <= 0 or n_rate > 99999999.99) then raise exception 'Некоректна ставка'; end if;
  n_planned := coalesce((p_patch->>'isPlanned')::boolean,d.is_planned);
  if n_amount::text = 'NaN' or n_hours::text = 'NaN' or n_paid::text = 'NaN'
    or n_amount < 0 or n_amount > 99999999.99 or n_hours < 0 or n_hours > 100.999999 or n_paid < 0 or n_paid > n_amount then
    raise exception 'Некоректні години, сума або оплата перевищує вартість';
  end if;
  if n_planned and (n_hours <> 0 or n_amount <> 0 or n_paid <> 0) then raise exception 'Планова робота не може мати години чи оплату'; end if;
  if not n_planned and (n_hours <= 0 or n_amount <= 0) then raise exception 'Введіть години і суму роботи'; end if;
  update public.work_days set date = coalesce((p_patch->>'date')::date,d.date), hours = n_hours, amount = n_amount,
    day_paid_amount = n_paid, rate_snapshot = n_rate, is_planned = n_planned,
    note = case when p_patch ? 'note' then p_patch->>'note' else d.note end,
    payment_status = case when n_paid <= 0 then 'unpaid' when n_paid >= n_amount then 'paid' else 'partial' end
    where id = p_day_id;
  if p_assignments is not null then
    if jsonb_typeof(p_assignments) <> 'array' then raise exception 'Некоректні призначення'; end if;
    if jsonb_array_length(p_assignments) > 0 and (
      (select sum(round((value->>'amount')::numeric,2)) from jsonb_array_elements(p_assignments)) <> n_amount or
      abs((select sum((value->>'hours')::numeric) from jsonb_array_elements(p_assignments)) - n_hours) > 0.02
    ) then raise exception 'Частки працівниць мають дорівнювати сумі та годинам запису'; end if;
    if (select count(distinct value->>'workerId') from jsonb_array_elements(p_assignments)) <> jsonb_array_length(p_assignments) then
      raise exception 'Працівниці не можуть повторюватися';
    end if;
    delete from public.work_day_assignments where work_day_id = p_day_id;
    for a in select value from jsonb_array_elements(p_assignments) loop
      if coalesce((a->>'amount')::numeric,0) <= 0 or coalesce((a->>'hours')::numeric,-1) < 0 or not exists(
        select 1 from public.workers where id = (a->>'workerId')::uuid and user_id = auth.uid()
      ) then raise exception 'Некоректна працівниця або її частка'; end if;
      insert into public.work_day_assignments(work_day_id,worker_id,amount,hours)
        values(p_day_id,(a->>'workerId')::uuid,round((a->>'amount')::numeric,2),(a->>'hours')::numeric);
    end loop;
  elsif n_amount <> d.amount or n_hours <> d.hours then
    if (select count(*) from public.work_day_assignments where work_day_id = p_day_id) > n_amount * 100 then
      raise exception 'Сума замала для часток усіх працівниць';
    end if;
    -- Rebalance both cents and minutes without dropping the last remainder unit.
    with weights as (
      select id, case when sum(amount) over() > 0 then amount/sum(amount) over() else 1.0/count(*) over() end aw,
        case when sum(hours) over() > 0 then hours/sum(hours) over() else 1.0/count(*) over() end hw
      from public.work_day_assignments where work_day_id = p_day_id
    ), exact as (
      select id,n_amount*100*aw av,round(n_hours*60)*hw hv from weights
    ), ranked as (
      select *,row_number() over(order by av-floor(av) desc,id) ar,row_number() over(order by hv-floor(hv) desc,id) hr,
        n_amount*100-sum(floor(av)) over() arem,round(n_hours*60)-sum(floor(hv)) over() hrem from exact
    ) update public.work_day_assignments a set
      amount = (floor(x.av) + case when x.ar <= x.arem then 1 else 0 end)/100,
      hours = (floor(x.hv) + case when x.hr <= x.hrem then 1 else 0 end)/60
      from ranked x where a.id = x.id;
  end if;
  perform public.aria_sync_report(d.report_id);
  return public.aria_day_json(p_day_id);
end;
$$;

create or replace function public.aria_save_entry(p_entry jsonb, p_day_id uuid default null) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  owner uuid := auth.uid(); new_id uuid := coalesce((p_entry->>'requestId')::uuid,gen_random_uuid());
  client public.clients; result jsonb; op public.aria_entry_operations;
begin
  if owner is null then raise exception 'Потрібен вхід'; end if;
  perform pg_advisory_xact_lock(hashtext(owner::text),1);
  if jsonb_typeof(p_entry) is distinct from 'object' or not (p_entry ?& array['clientId','date','hours','amount','paidAmount','isPlanned','assignments']) or exists(select 1 from jsonb_each(p_entry) where key in ('clientId','date','hours','amount','paidAmount','isPlanned','assignments') and value = 'null'::jsonb) then
    raise exception 'Неповні дані запису';
  end if;
  select * into op from public.aria_entry_operations where id = new_id and user_id = owner;
  if found then
    if op.payload is distinct from (p_entry - 'clientName') or (p_day_id is not null and op.day_id <> p_day_id) then
      raise exception 'Повторна операція має інші дані';
    end if;
    return public.aria_day_json(op.day_id);
  end if;
  select * into client from public.clients where id = (p_entry->>'clientId')::uuid and user_id = owner;
  if not found then raise exception 'Клієнт не знайдений або немає доступу'; end if;
  if p_day_id is not null then
    if not exists(select 1 from public.work_days d join public.reports r on r.id = d.report_id
      where d.id = p_day_id and r.user_id = owner and r.client_id = client.id) then raise exception 'Запис не належить клієнту'; end if;
    if not exists(select 1 from public.work_days where id = p_day_id and is_planned) then
      raise exception 'Роботу вже виконано. Оновіть запис';
    end if;
    result := public.aria_update_day(p_day_id,p_entry,p_entry->'assignments');
    insert into public.aria_entry_operations(id,user_id,day_id,payload) values(new_id,owner,p_day_id,p_entry - 'clientName');
    return result;
  end if;
  perform pg_advisory_xact_lock(hashtext(owner::text),hashtext(new_id::text));
  result := public.aria_day_json(new_id);
  if result is not null then
    if (result->>'client_id')::uuid <> client.id or exists(
      select 1 from public.work_days d where d.id = new_id and (
        d.date <> (p_entry->>'date')::date or d.hours <> round((p_entry->>'hours')::numeric,6) or
        d.amount <> round((p_entry->>'amount')::numeric,2) or d.day_paid_amount <> round((p_entry->>'paidAmount')::numeric,2) or
        d.is_planned <> (p_entry->>'isPlanned')::boolean or coalesce(d.note,'') <> coalesce(p_entry->>'note','') or
        d.rate_snapshot is distinct from round((p_entry->>'hourlyRate')::numeric,2)
      )
    ) or (select coalesce(jsonb_agg(jsonb_build_object('workerId',a.worker_id,'amount',a.amount,'hours',a.hours) order by a.worker_id),'[]'::jsonb)
      from public.work_day_assignments a where a.work_day_id = new_id) is distinct from
      (select coalesce(jsonb_agg(jsonb_build_object('workerId',v->>'workerId','amount',round((v->>'amount')::numeric,2),'hours',round((v->>'hours')::numeric,6)) order by v->>'workerId'),'[]'::jsonb)
      from jsonb_array_elements(p_entry->'assignments') v)
      then raise exception 'Повторна операція має інші дані'; end if;
    insert into public.aria_entry_operations(id,user_id,day_id,payload) values(new_id,owner,new_id,p_entry - 'clientName');
    return result;
  end if;
  insert into public.reports(id,user_id,client_id,client_name,date,status,payment_status,total_hours,total_earned,paid_amount,remaining_amount)
    values(new_id,owner,client.id,client.name,(p_entry->>'date')::date,'in_progress','unpaid',0,0,0,0);
  insert into public.work_days(id,report_id,date,hours,amount,payment_status,day_paid_amount,is_planned,note)
    values(new_id,new_id,(p_entry->>'date')::date,0,0,'unpaid',0,true,null);
  result := public.aria_update_day(new_id,p_entry,coalesce(p_entry->'assignments','[]'::jsonb));
  insert into public.aria_entry_operations(id,user_id,day_id,payload) values(new_id,owner,new_id,p_entry - 'clientName');
  return result;
end;
$$;

create or replace function public.aria_set_payments(p_payments jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare p jsonb; d public.work_days; result jsonb := '[]'::jsonb; paid numeric;
begin
  if auth.uid() is null then raise exception 'Потрібен вхід'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),1);
  if jsonb_typeof(p_payments) is distinct from 'array' then raise exception 'Некоректні оплати'; end if;
  for p in select value from jsonb_array_elements(p_payments) order by value->>'dayId' loop
    select wd.* into d from public.work_days wd join public.reports r on r.id = wd.report_id
      where wd.id = (p->>'dayId')::uuid and r.user_id = auth.uid() for update of wd;
    if not found then raise exception 'Запис не знайдено або немає доступу'; end if;
    if d.is_planned then raise exception 'Заплановану роботу ще не виконано'; end if;
    if p->>'status' is null or p->>'status' not in ('paid','unpaid','partial') then raise exception 'Некоректний статус оплати'; end if;
    paid := case p->>'status' when 'paid' then d.amount when 'unpaid' then 0 else (p->>'paidAmount')::numeric end;
    result := result || jsonb_build_array(public.aria_update_day(d.id,jsonb_build_object('paidAmount',paid)));
  end loop;
  return result;
end;
$$;

create or replace function public.aria_add_payment(p_day_id uuid, p_amount numeric, p_operation_id uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare d public.work_days; op public.aria_payment_operations;
begin
  if auth.uid() is null or p_operation_id is null or p_amount is null or p_amount::text = 'NaN' or round(p_amount,2) <= 0 then
    raise exception 'Введіть коректну суму';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),1);
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_operation_id::text));
  select * into op from public.aria_payment_operations where id = p_operation_id and user_id = auth.uid();
  if found then
    if op.day_id <> p_day_id or op.amount <> round(p_amount,2) then raise exception 'Повторна операція має інші дані'; end if;
    return public.aria_day_json(p_day_id);
  end if;
  select wd.* into d from public.work_days wd join public.reports r on r.id = wd.report_id
    where wd.id = p_day_id and r.user_id = auth.uid() for update of wd;
  if not found or d.is_planned then raise exception 'Робочий запис не знайдено'; end if;
  if d.day_paid_amount + round(p_amount,2) > d.amount then raise exception 'Сума перевищує залишок'; end if;
  insert into public.aria_payment_operations(id,user_id,day_id,amount) values(p_operation_id,auth.uid(),p_day_id,round(p_amount,2));
  return public.aria_update_day(p_day_id,jsonb_build_object('paidAmount',d.day_paid_amount + round(p_amount,2)));
end;
$$;

create or replace function public.aria_delete_day(p_day_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare v_report_id uuid;
begin
  if auth.uid() is null then raise exception 'Потрібен вхід'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),1);
  select d.report_id into v_report_id from public.work_days d join public.reports r on r.id = d.report_id
    where d.id = p_day_id and r.user_id = auth.uid() for update of d;
  if not found then return; end if;
  delete from public.work_days where id = p_day_id;
  if exists(select 1 from public.work_days d where d.report_id = v_report_id) then perform public.aria_sync_report(v_report_id);
  else delete from public.reports where id = v_report_id and user_id = auth.uid(); end if;
end;
$$;

create or replace function public.aria_add_worker(p_worker jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare w public.workers;
begin
  if auth.uid() is null or coalesce(length(trim(p_worker->>'name')),0) = 0 or length(trim(p_worker->>'name')) > 200 or coalesce(p_worker->>'color','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Введіть ім’я працівниці'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),0);
  insert into public.workers(user_id,name,color,is_primary) values(auth.uid(),trim(p_worker->>'name'),p_worker->>'color',
    not exists(select 1 from public.workers where user_id = auth.uid() and is_primary)) returning * into w;
  return to_jsonb(w);
end;
$$;

revoke all on function public.aria_day_json(uuid),public.aria_sync_report(uuid),public.aria_update_day(uuid,jsonb,jsonb),
  public.aria_save_entry(jsonb,uuid),public.aria_set_payments(jsonb),public.aria_add_payment(uuid,numeric,uuid),
  public.aria_delete_day(uuid),public.aria_add_worker(jsonb) from public,anon;
grant execute on function public.aria_day_json(uuid),public.aria_sync_report(uuid),public.aria_update_day(uuid,jsonb,jsonb),
  public.aria_save_entry(jsonb,uuid),public.aria_set_payments(jsonb),public.aria_add_payment(uuid,numeric,uuid),
  public.aria_delete_day(uuid),public.aria_add_worker(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
