# Cleaning Reports 3.0 — аудит і план архітектури

> Технічний двійник концепції [V3-CONCEPT.md](V3-CONCEPT.md).
> Кожен пункт — конкретна знайдена проблема в поточному коді та рішення для 3.0.

---

## 0. Критичні проблеми (TL;DR)

| # | Проблема | Де | Тяжкість |
|---|---|---|---|
| 1 | **N+1×N+1 запити**: `getReports` робить `1 + R + R×D` HTTP-запитів (звіти → дні → призначення), і його викликає кожен екран при кожному фокусі вікна | `src/lib/api.ts:65-115` | 🔴 критична |
| 2 | **TanStack Query встановлений, але не використовується жодного разу** — замість кешу самописні `useEffect + window.focus` рефетчі всього на світі | `App.tsx` (провайдер є), всі сторінки | 🔴 критична |
| 3 | **Подвійна модель імен** snake_case/camelCase (`day.paymentStatus \|\| day.payment_status`) прошита крізь усі шари; наслідок — 14 помилок `tsc --noEmit`, які ніколи не перевіряються (build = лише vite) | `types/report.ts`, `api.ts`, всі сторінки | 🔴 критична |
| 4 | **UTC-баг «сьогодні»**: `new Date().toISOString().split('T')[0]` — після 22:00–02:00 за Києвом/Римом «сьогодні» їде на добу; поруч існує правильний `formatLocalDate` | `Index.tsx` (isToday), місцями в CreateReport | 🔴 критична |
| 5 | **Грошові агрегати рахуються клієнтом у 5 місцях** з копіпастом (Index, Dashboard, ReportsStatus, ReportDetails, ClientReports) і зберігаються денормалізовано в `reports.total_*` — джерела правди два, розсинхрон гарантований | сторінки + `reports` таблиця | 🔴 критична |
| 6 | **Фейкові сутності** `consolidated-${clientId}` — зведені «звіти» створюються на льоту зі спец-префіксом id і розпізнаються через `startsWith` | `ReportsStatus.tsx:179`, `ReportCard.tsx` | 🟠 висока |
| 7 | **Автозбереження на unmount** із дубльованою логікою (виклик `handleSave()` + другий ручний апдейт поруч) — стан беруть із ref-ів, помилки мовчки ковтаються | `WorkDayDetails.tsx:86-120` | 🟠 висока |
| 8 | **Write-on-read**: `ensurePrimaryWorker('Лідія')` створює запис у БД при кожному завантаженні списку працівників; ім'я «Лідія» захардкоджене у 3 місцях | `api.ts:376`, `WorkerContext`, `WorkerSelector` | 🟠 висока |
| 9 | **Бандл ~694 КБ одним чанком**, без route-splitting; recharts у бандлі, хоча графіків немає | `vite.config.ts`, `App.tsx` | 🟠 висока |
| 10 | **Міграції = розсип .sql у корені репо** (`cleanup-workers.sql`, `update-worker-deletion-behavior.sql`…) — невідомо, що застосовано в проді; типи БД у `supabase.ts` написані руками і вже відстають від схеми (нема `is_planned`, `workers`, `assignments`) | корінь репо, `src/lib/supabase.ts` | 🟠 висока |
| 11 | **Нуль тестів, нуль CI** — фінансова логіка (частк. оплати, частки працівників) не покрита нічим | весь репо | 🟠 висока |
| 12 | Помилки мутацій ковтаються `console.error` без відкату UI і часто без тосту; ErrorBoundary відсутній | `Index.handleStatusChange` та ін. | 🟡 середня |
| 13 | `user-scalable=no` + `lang="en"` в `index.html`; PWA-кеш містить захардкоджений URL Supabase | `index.html`, `vite.config.ts:46` | 🟡 середня |
| 14 | RLS: `work_days`/`work_day_assignments` не мають `user_id`; політики мають перевіряти ланцюжок через `reports.user_id` — потребує аудиту в Supabase | схема БД | 🟡 середня (потенційно 🔴) |

---

## 1. Модель даних 3.0

**Проблема.** Історично «звіт» = обгортка навколо днів одного клієнта з
денормалізованими сумами. Реальна ж одиниця обліку в застосунку — **робочий
день**. Звідси: фейкові consolidated-звіти, дублювання `client_name`,
агрегати, які треба перераховувати руками, і updateReport на 40 рядків
if-ів.

**Рішення.** Центр моделі — `work_days`, «звіт» перестає бути таблицею-правдою:

```
clients(id, user_id, name, hourly_rate, archived_at)
workers(id, user_id, name, color, is_primary)
work_days(id, user_id, client_id, date, hours, amount,
          payment_status, paid_amount, is_planned, note)
work_day_assignments(id, work_day_id, worker_id, hours, amount,
                     deleted_worker_name)
```

- `work_days.user_id` + `client_id` напряму (без проміжного report) —
  простий RLS, прості запити, нема дублю імені клієнта.
- Усі агрегати (заробіток місяця, борг клієнта, статистика) — **view/RPC
  у Postgres**: `client_balances`, `monthly_summary`. Один запит — готові
  числа, однакові на всіх екранах.
- Індекси: `work_days(user_id, date)`, `work_days(client_id)`,
  `assignments(work_day_id)`, `assignments(worker_id)`.
- **Міграція даних**: скрипт розгортає `reports.work_days → work_days`
  (user_id і client_id беруться зі звіту), звіряє контрольні суми,
  таблиця `reports` лишається як read-only архів до підтвердження.

## 2. Шар даних: TanStack Query + один запит

- `getReports` (1+R+R×D) → **один** запит із вкладеним select:
  `work_days.select('*, assignments:work_day_assignments(*, worker:workers(*))')`
  з фільтром за період. PostgREST це вміє з коробки.
- Хуки домену: `useWorkDays(period)`, `useClientBalances()`,
  `useWorkers()`, `useClients()`, `useMonthlySummary()` — усі на
  `useQuery` з нормальними `queryKey` і `staleTime`.
- Мутації: `useMutation` + **оптимістичні оновлення** для зміни статусу
  оплати (миттєвий UI) з відкатом при помилці; інвалідація за ключами
  замість ручних `loadReports()` після кожної дії.
- `refetchOnWindowFocus` дає React Query (де доречно) — усі самописні
  `window.addEventListener('focus', …)` видаляються.
- Pull-to-refresh на головній замість невидимої магії фокуса.

## 3. Типи: одна мова в домені

- `supabase gen types typescript` → `src/data/database.types.ts`
  (генеровано, не руками; поточний ручний `Database` тип видаляється).
- Доменні типи **тільки camelCase** (`WorkDay`, `Client`, …) +
  мапери `fromRow/toRow` на межі шару даних. Жодного
  `x.paymentStatus || x.payment_status` у компонентах.
- `tsc --noEmit` у `build` і в CI; виправити наявні 14 помилок;
  далі — `strict: true` (зараз послаблення в tsconfig).

## 4. Дати та гроші: чисте ядро `src/domain/`

- `domain/dates.ts`: тип `ISODate` (date-only рядок), `todayLocal()`,
  `formatDay()`, `monthRange()` — єдине місце роботи з датами; заборона
  `toISOString().split` лінт-правилом. Виправляє UTC-баг «сьогодні».
- `domain/money.ts`: розрахунок часток працівників, часткових оплат,
  прогресу місяця — чисті функції, повністю покриті юніт-тестами
  (зараз ця логіка розсипана по 5 сторінках із дублікатами).
- Зберігання грошей: numeric в БД, у застосунку — цілі центи або
  Number з округленням в одному місці (зараз Math.round розкиданий).

## 5. Стан застосунку

- Серверний стан → React Query (п.2). Контексти лишаються тільки для
  справжнього клієнтського стану: `AuthProvider`, вибраний працівник.
- Вибраний працівник, останні працівники, чернетки → модуль
  `lib/storage.ts` з типізованими ключами (зараз сирі
  `localStorage.getItem` у 6 місцях).
- `ensurePrimaryWorker` іде з read-шляху: основний працівник створюється
  один раз в онбордингу/міграції; хардкод «Лідія» зникає, «основний»
  визначається прапорцем.

## 6. Помилки та спостережуваність

- Кореневий `ErrorBoundary` + м'який fallback-екран у мові Aria.
- Політика мутацій: оптимістично → відкат + тост із дією «Повторити».
- Sentry (або GlitchTip) для проду: помилки JS + невдалі мутації.
- Видалити тихі `catch { console.error }` — усі шляхи або відновлюються,
  або чесно показують стан.

## 7. Продуктивність

- `React.lazy` на всі маршрути + `manualChunks` (vendor / supabase / ui) —
  ціль: перший екран < 150 КБ gzip (зараз ~195 КБ одним js).
- Видалити мертві залежності: recharts, embla, input-otp, resizable-panels,
  vaul і невикористані `components/ui/*` (аудит через knip).
- Списки місяця — без важких перерахунків на кожен рендер (агрегати
  приходять готовими з view, мемоїзація лишається тільки для групування).
- Шрифти: subset woff2 (latin+cyrillic), `font-display: swap`.

## 8. PWA / офлайн

- Читання: кеш React Query + persistQueryClient в IndexedDB —
  застосунок відкривається офлайн із останніми даними.
- Мутації офлайн: черга (React Query mutation persist / Background Sync);
  статус «синхронізується…» в UI. Мінімальний обсяг 3.0: read-офлайн +
  банер «немає мережі», черга — наступний крок.
- Маніфест/іконки/theme-color — у мові Aria; хардкод Supabase-URL у
  workbox-конфігу → з env.

## 9. Безпека

- **Аудит RLS** (обов'язково до міграції): політики на `work_days`,
  `work_day_assignments`, `workers` — доступ лише через `user_id`
  (нова модель кладе `user_id` прямо в `work_days`, що робить політики
  тривіальними).
- `.env` не в гіті (ок), ключ тільки anon (ок). Перевірити, що в проді
  не увімкнений публічний signup, якщо застосунок приватний.
- Supabase URL з env усюди (зараз продубльований у vite.config).

## 10. Тестування

- **Vitest**: `domain/money`, `domain/dates` — таблиці кейсів (часткова
  оплата, частки двох працівниць, межі місяця, «сьогодні» о 23:30).
- **Testing Library**: критичні флоу компонентів — зміна статусу з
  оптимістичним відкатом, створення запису, видалення з підтвердженням.
- **Playwright smoke** (проти demo-моку): 5 сценаріїв — створити запис,
  позначити оплаченим, часткова оплата, видалити, навігація доком.
- Ціль покриття: domain 100%, решта — за флоу, без гонитви за цифрою.

## 11. CI/CD

- GitHub Actions: `typecheck → lint → vitest → build` на кожен PR;
  Playwright smoke — на main. Vercel preview на PR (vercel.json вже є).
- `npm run build` = `tsc --noEmit && vite build`.

## 12. Структура коду 3.0

```
src/
  domain/        # чисті розрахунки: money, dates, statuses (0 залежностей)
  data/          # supabase client, database.types (gen), мапери, query-хуки
  features/
    timeline/    # головна: стрічка днів
    entry/       # створення/редагування запису (+ работниці)
    debts/       # очікую / борги / нагадування
    insights/    # звіт
    clients/     # клієнти
    auth/
  ui/            # дизайн-система Aria: примітиви + композити (док, чипи…)
  app/           # маршрути, провайдери, ErrorBoundary
supabase/
  migrations/    # supabase CLI; розсип .sql з кореня → сюди, корінь чиститься
```

## 13. Порядок реалізації (кожна фаза — робочий застосунок)

1. **Фаза 0 — страхувальна сітка:** tsc у build + виправити 14 помилок,
   vitest + перші тести на винесений domain/, CI, knip-чистка залежностей.
2. **Фаза 1 — дані:** supabase CLI + міграції, нова схема + view + RLS,
   скрипт переносу даних, генеровані типи, шар data/ на React Query
   (старі екрани перекладаються на нові хуки без зміни вигляду).
3. **Фаза 2 — Aria UI:** нова дизайн-система в `ui/`, екран за екраном
   у новій мові; свайпи, прогрес місяця, чипи-періоди, графік.
4. **Фаза 3 — досвід:** view transitions, скелетони, офлайн-read,
   «Нагадати», порожні стани, доступність (масштаб, lang, контрасти).
5. **Фаза 4 — реліз:** Sentry, Playwright smoke, PWA-іконки Aria,
   виміри бандла, чек проду.

Ризики: найнебезпечніша — міграція даних (фаза 1); тому вона йде окремим
PR із бекапом, контрольними сумами і збереженням `reports` як архіву до
ручного підтвердження.
