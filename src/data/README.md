# Шар даних

`Backend` (backend.ts) — контракт; сторінки знають лише хуки з `queries.ts`
і доменні типи з `@/domain/types`.

- **backend.supabase.ts** — прод. Зараз працює проти *старої* схеми
  (`reports → work_days → work_day_assignments`) одним вкладеним
  PostgREST-запитом.
- **demo/fixture.ts** — `VITE_DEMO=1`: in-memory дані для розробки,
  скриншотів і smoke-тестів (у прод-бандл не потрапляє).

## Перемикання на схему v3 (після застосування supabase/migrations)

Змінюється ТІЛЬКИ `backend.supabase.ts`:

1. `fetchWorkDays` → `from("work_days_v3").select("*, work_day_assignments_v3(*, worker:workers(*))")`
   (зникає обгортка reports і поле `reportId`).
2. `createWorkEntry` → один insert у `work_days_v3` (+assignments), без report.
3. `deleteReport` → видалити; `useDeleteReport` замінюється `useDeleteWorkDay`.
4. Балансові хуки можуть перейти з `domain/stats.ts` на в'ю
   `client_balances`/`monthly_summary` (не обов'язково — контракти однакові).
5. `domain/types.ts`: прибрати `reportId` з `WorkDay`.
