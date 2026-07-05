-- 0003_client_history_view.sql
-- В'ю історії робіт по клієнту для «Картки клієнта» (Ясно 4.0, PRD §10.1).
-- Застосовувати ПІСЛЯ 0001 і 0002. security_invoker=true → успадковує RLS
-- базової таблиці work_days_v3 (користувач бачить лише свої рядки).

create or replace view client_history
with (security_invoker = true) as
select
  wd.id,
  wd.user_id,
  wd.client_id,
  c.name as client_name,
  wd.date,
  wd.hours,
  wd.amount,
  wd.paid_amount,
  wd.payment_status,
  wd.is_planned,
  wd.note,
  wd.created_at
from work_days_v3 wd
join clients c on c.id = wd.client_id;

comment on view client_history is
  'Ясно 4.0: усі робочі дні клієнта з іменем клієнта (для таймлайну картки).';
