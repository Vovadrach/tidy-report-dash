# Шар даних

`Backend` (backend.ts) — контракт; сторінки знають лише хуки з `queries.ts`
і доменні типи з `@/domain/types`.

- **backend.supabase.ts** — легасі-прод. Працює проти *старої* схеми
  (`reports → work_days → work_day_assignments`) одним вкладеним
  PostgREST-запитом.
- **backend.supabase.v3.ts** — прод на схемі v3 (`work_days_v3` +
  `work_day_assignments_v3`, без обгортки reports). Готовий, вмикається
  флагом `VITE_V3=1`.
- **demo/fixture.ts** — `VITE_DEMO=1`: in-memory дані для розробки,
  скриншотів і smoke-тестів (у прод-бандл не потрапляє).

## Перемикання на схему v3

1. Застосувати `supabase/migrations/0001..0003` до прод-БД
   (див. `supabase/README.md` — дія користувача, потрібен доступ до БД).
2. Виставити `VITE_V3=1` у середовищі збірки/деплою — і все. Контракт
   `Backend` незмінний, жодна сторінка не торкається. `reportId` мапиться
   на `id` дня, тож `useDeleteReport` працює далі без змін.
3. (Опційно) балансові хуки можуть перейти з `domain/stats.ts` на в'ю
   `client_balances`/`monthly_summary` — контракти однакові.
4. Після стабілізації: прибрати легасі `backend.supabase.ts`, поле
   `reportId` з `WorkDay`, і `supabase/legacy/*`.
