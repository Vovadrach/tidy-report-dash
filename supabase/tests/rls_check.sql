-- RLS-перевірка v3 (WP-1.3). Виконати в SQL editor від імені authenticated-
-- ролі з підміненим uid (Supabase: використати два тест-акаунти) або через
-- `supabase test db`. Очікування описані в коментарях.

-- 1) Анонім (роль anon): 0 рядків / помилка на запис
set local role anon;
select count(*) = 0 as anon_reads_nothing from public.work_days_v3;
-- insert має впасти:
-- insert into public.work_days_v3 (user_id, client_id, date) values (gen_random_uuid(), gen_random_uuid(), now());
reset role;

-- 2) Чужий користувач: підставити uid користувача A, читати дані користувача B
-- set local request.jwt.claims = '{"sub":"<uuid-user-A>","role":"authenticated"}';
-- select count(*) = 0 as foreign_reads_nothing
--   from public.work_days_v3 where user_id = '<uuid-user-B>';

-- 3) В'ю успадковують RLS (security_invoker):
-- select count(*) = 0 as balances_isolated
--   from public.client_balances where user_id = '<uuid-user-B>';
