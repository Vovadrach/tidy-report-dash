# PRD / Специфікація реалізації — Cleaning Reports 3.0 «Aria»

| | |
|---|---|
| **Статус** | Затверджено до реалізації |
| **Версія** | 1.0 · 2026-07-04 |
| **Гілка** | `feat/ui-redesign-2026` → релізна `v3` |
| **Джерела** | [V3-CONCEPT.md](V3-CONCEPT.md) (бачення), [V3-ARCHITECTURE.md](V3-ARCHITECTURE.md) (аудит) |
| **Виконавець** | агент; цей документ — єдине джерело правди під час реалізації |

**Як користуватися документом.** Реалізація йде робочими пакетами (§12) строго
по порядку. Перед кожним пакетом агент перечитує його розділ вимог, після —
проганяє протокол верифікації (§13) і комітить. Якщо реальність суперечить
специфікації — виправляється специфікація (окремим комітом, з приміткою),
а не мовчки код. Позначка 🔎 = «рішення знайти в процесі» — дозволений
дослідницький крок із фіксацією результату в цьому документі.

---

## 1. Мета

Випустити покоління 3.0: той самий застосунок за звичками користувачки,
але з повністю новою дизайн-мовою «Aria», вилікуваною архітектурою даних
і сучасним стеком. Одночасно закрити всі 14 проблем аудиту
(V3-ARCHITECTURE §0).

**Метрики успіху**
- Перше завантаження (4G, холодний кеш): FCP < 1.5 c; перший JS-чанк < 150 КБ gzip.
- Відкриття будь-якого екрана з кешу: миттєво (skeleton → дані < 100 мс з IndexedDB).
- Кількість HTTP-запитів на головній: 1–2 (зараз 1 + R + R×D).
- `tsc --noEmit` = 0 помилок; lint = 0 помилок; domain-тести 100% покриття.
-零 (нуль) регресій флоу: всі 5 smoke-сценаріїв (§13.4) зелені.

## 2. Не-мета (out of scope 3.0)

- Мультивалютність, мультимова (залишаємо UAH-інтерфейс/€-суми як є).
- Синхронізація між кількома користувачами одного акаунта.
- Нативні застосунки; лишаємось PWA.
- Повна офлайн-черга мутацій (у 3.0 — офлайн-читання + банер; черга = v3.1, §11.4).

## 3. Користувачка та сценарії

Персона: жінка 25–45, професійно прибирає апартаменти (Італія), веде облік
сама, телефон — основний пристрій, користується щодня по 30–60 секунд.

Jobs-to-be-done (незмінні з 1.0 — це «скелет»):
1. Після зміни за 15 секунд записати: клієнт, години → сума порахувалась сама.
2. Одним поглядом побачити: скільки заробила цього місяця і скільки з того вже оплачено.
3. Побачити, хто скільки винен, і позначити оплату (повну/часткову) в один дотик.
4. Розділити зміну між працівницями і бачити частку кожної.
5. Запланувати майбутню зміну.

## 4. Цільовий стек

### 4.1 Оновлення / додавання

| Технологія | Версія | Призначення | Пакет |
|---|---|---|---|
| React | **19.x** | сучасний рантайм, `use`, кращі transitions | `react`, `react-dom` |
| React Router | **7.x** (library mode) | маршрути, drop-in із v6 | `react-router` |
| Vite | **7.x** | збірка | `vite`, `@vitejs/plugin-react-swc` |
| TanStack Query | **5.x** (вже в deps) | серверний стан, кеш, optimistic | `@tanstack/react-query` + `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister` |
| Motion | **12.x** | свайпи карток, springs, layout-анімації | `motion` |
| Supabase CLI | latest | міграції, `gen types` | dev-залежність/brew |
| Vitest | 3.x | юніт/компонентні тести | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` |
| Playwright | latest | smoke-тести UI | `@playwright/test` (dev) |
| knip | latest | пошук мертвого коду/залежностей | dev |
| Zod | 3.x (вже в deps) | валідація на межі БД→домен у маперах | `zod` |
| Fixel | latest | фірмова гарнітура | 🔎 самохост woff2 з github.com/MacPaw/fixel (OFL); fallback: `@fontsource-variable/golos-text` |
| Sentry | latest | помилки в проді (env-gated) | `@sentry/react` |

Лишаються: Tailwind CSS 4 (CSS-first, вже мігровано), Phosphor Icons,
Supabase JS v2, sonner, vite-plugin-pwa, radix-примітиви (лише вживані).

### 4.2 Видалення (після knip-аудиту, WP-0.3)

`recharts` (графік 3.0 — власний SVG), `embla-carousel-react`, `input-otp`,
`react-resizable-panels`, `vaul`, `cmdk`, `date-fns`(🔎 якщо не вживається),
`next-themes`(🔎), `lovable-tagger`, невикористані `@radix-ui/*` і файли
`components/ui/*`, `react-hook-form`+`@hookform/resolvers`(🔎 форми прості,
некеровані). Кожне видалення — після підтвердження knip + build + smoke.

### 4.3 Сучасні техніки, які застосовуються обов'язково

- **Optimistic updates** з відкатом (React Query) — усі зміни статусів.
- **persistQueryClient → IndexedDB/localStorage** — миттєвий старт і офлайн-read.
- **View Transitions API** для переходів картка→деталі (progressive enhancement: `if (!document.startViewTransition) навігація як звичайно`).
- **`React.lazy` + route-level chunks**, `manualChunks: { vendor, supabase }`.
- **Skeleton-екрани** (не спінери) на всіх маршрутах.
- **Postgres view/RPC** для агрегатів — жодної фінансової математики в компонентах.
- **Генеровані типи БД** + Zod-перевірка рядків у маперах (дешева: тільки в dev).
- **Feature-sliced структура** (§10) — код групується за фічами, не за типами файлів.

## 5. Дизайн-система «Aria» — специфікація токенів

Файл: `src/index.css` (повна заміна теми Atelier). Семантика класів
зберігається (`surface-card`, `chip-*`, `stat-tile-*`, `app-bar`, `dock`,
`micro-label` → видалити, `num-display` → перейменувати в `display`),
значення — нові.

### 5.1 Кольори (light)

```css
--background:  oklch(0.982 0.005 200);  /* аква-повітря */
--foreground:  oklch(0.27  0.03  220);  /* синьо-зелене чорнило */
--card:        oklch(1 0 0);
--primary:     oklch(0.55  0.10  180);  /* евкаліпт */
--primary-foreground: oklch(0.99 0.003 200);
--secondary:   oklch(0.955 0.008 200);
--muted:       oklch(0.945 0.008 200);
--muted-foreground: oklch(0.50 0.02 220);
--accent:      var(--primary);
--success:     oklch(0.55 0.11 150);    /* мох — оплачено */
--warning:     oklch(0.68 0.13 75);     /* бурштин — частково/заплановано */
--destructive: oklch(0.58 0.13 35);     /* теракота — не оплачено */
--border:      oklch(0.915 0.008 200);
--ring:        var(--primary);
--radius:      1.5rem;
```

Dark («кімната ввечері»): `--background oklch(0.17 0.02 220)`, card `0.21`,
border `0.30`, primary `oklch(0.72 0.09 180)`, статуси +0.12 L.
**Суми грошей — завжди `--foreground`** + символ € у `--muted-foreground`;
кольором кодується лише статус оплати (концепт §3.2).

### 5.2 Типографіка

- `--font-sans: "Fixel Text", …fallback`; `--font-display: "Fixel Display", …`.
- Шкала: display-xl 28/34 (числа шапки), display-md 22 (заголовки екранів,
  імена клієнтів), body 15, caption 13, chip 12. Числа — `tabular-nums`.
- Підписи — звичайні малі літери `--muted-foreground` (капітель 2.x видалити).

### 5.3 Форма, тінь, рух

- Радіуси: картка 24px, чип/кнопка — pill, док 32px, FAB — коло 60px.
- Тіні: 2 рівні — `--shadow-rest` (ледь помітний серпанок) і `--shadow-float`
  (док, FAB, відкриті шари). Жодних border+shadow одночасно, крім `dock`.
- Motion: тапи scale 0.97 (100 мс); появи — spring stiffness 260 damping 24;
  зміна статусу — 250 мс «крапля» кольору в чипі (motion layout).
- Іконки: Phosphor; активний стан `weight="fill"`, спокійний `weight="regular"`
  (IconContext default = regular; duotone 2.x видалити).

### 5.4 Компонентний інвентар (src/ui/)

`AppBar`, `Dock`, `Fab`, `HomePill`, `DayMarker` (маркер дати),
`WorkDayCard` (+ swipe-дії), `StatusDrop` (краплина статусу: контур/половина/повна),
`Chip`, `StatTile`, `MonthProgress` (прогрес-бар оплат), `PeriodChips`,
`EarningsChart` (SVG-бари, 6 міс.), `EmptyState` (ілюстрація+дія),
`ConfirmSheet` (AlertDialog у стилі Aria), `Skeleton`, `SaveIndicator`.
Кожен компонент — файл у `src/ui/`, без бізнес-логіки, приймає доменні типи.

## 6. Модель даних (ціль)

### 6.1 DDL (supabase/migrations)

```sql
-- 0001_v3_schema.sql
alter table clients add column if not exists archived_at timestamptz;

create table work_days_v3 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
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
create index on work_days_v3 (user_id, date desc);
create index on work_days_v3 (client_id);

create table work_day_assignments_v3 (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references work_days_v3(id) on delete cascade,
  worker_id uuid references workers(id) on delete set null,
  deleted_worker_name text,
  hours numeric(6,2) not null default 0,
  amount numeric(10,2) not null default 0
);
create index on work_day_assignments_v3 (work_day_id);

-- RLS: увімкнути на обох; політики user_id = auth.uid()
-- (assignments — через exists(select 1 from work_days_v3 …)).

-- В'ю агрегатів (security_invoker!):
create view client_balances with (security_invoker) as
  select user_id, client_id,
         sum(amount) filter (where not is_planned)            as total_earned,
         sum(least(paid_amount, amount))                      as total_paid,
         sum(amount - least(paid_amount, amount))
             filter (where payment_status <> 'paid')          as total_due,
         sum(hours) filter (where payment_status <> 'paid')   as unpaid_hours
  from work_days_v3 group by user_id, client_id;

create view monthly_summary with (security_invoker) as
  select user_id, date_trunc('month', date)::date as month,
         sum(hours) as hours, sum(amount) as earned,
         sum(least(paid_amount, amount)) as paid
  from work_days_v3 where not is_planned
  group by user_id, 1;
```

Інваріант: `payment_status` — похідний від `paid_amount`/`amount`
(0 → unpaid; < amount → partial; ≥ amount → paid). Тримається тригером БД 🔎
або доменною функцією `resolveStatus()` — рішення в WP-1.2; обидва не одночасно.

### 6.2 Міграція даних (WP-1.4, окремий PR)

`supabase/migrations/0002_backfill.sql`: `insert into work_days_v3
(user_id, client_id, date, …) select r.user_id, r.client_id, wd.date, …
from work_days wd join reports r on r.id = wd.report_id;` + перенос
assignments. Контрольні суми до/після: `sum(amount)`, `sum(paid)`, `count(*)`
по користувачу — мають збігтися; лог у PR. Старі таблиці не видаляються
до ручного підтвердження (read-only архів), фронт перемикається атомарно.
`consolidated-*` логіка видаляється разом із переходом на `client_balances`.

### 6.3 Домен (src/domain/)

```ts
type ISODate = string & { __brand: 'ISODate' };        // 'YYYY-MM-DD', локальна
type PaymentStatus = 'paid' | 'partial' | 'unpaid';
interface WorkDay { id; clientId; date: ISODate; hours; amount;
                    paidAmount; status: PaymentStatus; isPlanned; note?;
                    assignments: Assignment[] }
```
- `domain/dates.ts`: `todayLocal(): ISODate`, `monthRange(d)`, `formatDay(d, locale)`.
  Лінт-правило (`no-restricted-syntax`) забороняє `toISOString().split` поза цим файлом.
- `domain/money.ts`: `resolveStatus(paid, amount)`, `applyPartialPayment(day, sum)`,
  `workerShare(day, workerId)`, `splitBetweenWorkers(total, splits)`,
  `monthProgress(days)`. Тільки чисті функції. camelCase всюди;
  мапери `data/mappers.ts` — єдине місце, де існує snake_case.

## 7. Шар даних — контракти (src/data/)

```ts
// Ключі кешу
keys = {
  workDays: (p: {from: ISODate; to: ISODate}) => ['workDays', p],
  balances: () => ['balances'],
  monthly:  () => ['monthly'],
  clients:  () => ['clients'],
  workers:  () => ['workers'],
}

useWorkDays(period)         // 1 запит: work_days_v3 + вкладені assignments+worker
useClientBalances()         // select * from client_balances
useMonthlySummary()         // останні 6 місяців
useClients() / useWorkers()
useUpsertWorkDay()          // create/update; інвалідує workDays+balances+monthly
useSetPayment()             // ОПТИМІСТИЧНО: одразу правит кеш workDays/balances,
                            // відкат + toast(«Повторити») при помилці
useDeleteWorkDay()          // оптимістично прибирає з кешу
```

Правила: `staleTime: 60_000`; `refetchOnWindowFocus: true` тільки для
workDays/balances; **жодних** ручних `loadX()` і `window.focus`-лісенерів у
компонентах; фільтр за працівницею — **клієнтський селектор** над кешем
workDays (дані вже містять assignments), не окремий запит.
`persistQueryClient` + buster = git-версія схеми кешу.

## 8. Функціональні вимоги поекранно

Формат: **FR-n** вимога → критерії приймання (AC). UX-скелет незмінний
(концепт §4). Всі екрани: skeleton при першому завантаженні, EmptyState
якщо даних нема, помилка = екран із «Повторити».

### FR-1 Головна «Стрічка днів» (`/`)
1. Шапка: місяць (display-шрифт), стрілки, **MonthProgress**: `оплачено X з Y €`
   + тонкий бар; два StatTile (години / заробіток) — дані з `monthly_summary`
   поточного місяця + селектор працівниці.
2. Стрічка днів як зараз (маркер дати + картки), «сьогодні» — виділений маркер;
   **AC:** о 23:30 за Europe/Rome «сьогодні» показує локальну дату (тест на
   `todayLocal`).
3. **Свайп картки вправо** → статус paid (оптимістично, «крапля» анімація);
   **свайп вліво** → ConfirmSheet видалення. AC: свайп не конфліктує зі скролом
   (поріг 24px по X, кут < 30°); дія доступна і без свайпу (краплина статусу —
   меню як зараз).
4. **Тап по маркеру дати** → `/create-report?date=YYYY-MM-DD`; AC: дата
   передалась і підставилась.
5. Часткова оплата: інлайн-поле як зараз; AC: сума > залишку — заборонено з
   повідомленням; статус перераховується `resolveStatus`.
6. Pull-to-refresh (🔎 обрати: нативний overscroll або легкий кастом) →
   `invalidateQueries`.

### FR-2 Створення/редагування запису (`/select-client`, `/create-report`)
1. Вибір клієнта: пошук, картки, «додати клієнта» — як зараз, у мові Aria;
   останній використаний клієнт — першим у списку (localStorage).
2. Колесо часу: кроки годин 0–23, хвилин 00–45 по 15; великі зони дотику;
   AC: сума = години × ставка, оновлюється миттєво; введення суми перераховує
   час (як зараз), явний перемикач напрямку.
3. Працівниці: діалог розподілу як зараз; AC: сума часток = сумі дня, інакше
   кнопка неактивна з поясненням; без вибору — призначається основна.
4. «Створити» / «Запланувати» / «Видалити» (для планового) — логіка як зараз;
   AC: всі кнопки над доком, клікабельні (elementFromPoint-тест у smoke).
5. Після створення — навігація на головну, новий запис видно без рефетчу
   (кеш оновлено мутацією).

### FR-3 Очікую (`/reports-status`) + клієнт (`/client-reports/:id`)
1. Дані — `client_balances` (більше жодних consolidated-хаків); сортування за
   боргом; сума боргу — найбільше число картки.
2. **«Нагадати»** на картці: `navigator.share` з текстом
   `«Добрий день! За прибирання: N год, борг X €. Дякую!»` (шаблон у
   `domain/reminder.ts`); fallback — копіювання в буфер + toast. AC: працює
   без share API (desktop).
3. «Оплачено всі (N)» — як зараз, одною мутацією батчем, оптимістично.

### FR-4 Звіт (`/dashboard`)
1. Період: **PeriodChips** `Місяць · Рік · Весь час` + стрілки для місяця;
   фільтр клієнта — дропдаун як зараз. AC: один дотик змінює період.
2. 4 StatTile (зароблено/години/сплачено/залишок) з `monthly_summary`/balances.
3. **EarningsChart**: SVG-бари останніх 6 місяців (заробіток, поверх — оплачено);
   AC: доступний опис (aria-label зі значеннями), працює в темній темі.
4. Борги по клієнтах + Топ клієнтів — як зараз, з balances.

### FR-5 Деталі дня (`/report/:id/day/:id` → стає `/day/:id`)
1. Маршрут спрощується до `/day/:dayId` (redirect зі старого шляху).
2. Редагування годин/дати/нотатки; **SaveIndicator**: «Зберігаю… → Збережено ✓»
   (debounce 800 мс, явна мутація; автозбереження-на-unmount видалити).
3. Статуси — сегмент из 3 кнопок як зараз; видалення — ConfirmSheet.
   AC: кнопка видалення клікабельна над доком (smoke).

### FR-6 Клієнти (`/client-management`)
Як зараз (список, додати, редагувати, видалити з ConfirmSheet), у мові Aria;
видалення клієнта попереджає про кількість записів, що зникнуть (з balances).

### FR-7 Авторизація (`/login`, `/register`)
Aria-версія поточних екранів; логотип-мітка 3.0; повідомлення помилок
Supabase — людською мовою (мапа кодів у `features/auth/errors.ts`).

### FR-8 Працівниці (селектор над доком)
Як зараз (вибір, додавання, видалення з підтвердженням); кнопка «видалити
дублікати Лідія» **видаляється** (одноразовий інструмент); основна працівниця
створюється в онбордингу (перший логін без workers → створити з імені 🔎
запитати ім'я діалогом, дефолт «Основна»).

## 9. Нефункціональні вимоги

| Область | Вимога |
|---|---|
| Продуктивність | бюджети §1; `npm run build` друкує розміри; перевірка в WP-4.2 |
| Доступність | зони дотику ≥44px; контраст AA (перевірити токени §5.1); `lang="uk"`; прибрати `user-scalable=no`; фокус-стани видимі |
| Офлайн | відкриття без мережі: останні дані з persist-кешу + банер «Офлайн»; мутації офлайн — заблоковані з поясненням (черга = v3.1) |
| Безпека | RLS-тести (WP-1.3): анонім і чужий user не читають/не пишуть `work_days_v3`; ключі тільки з env |
| Спостережуваність | Sentry init за `VITE_SENTRY_DSN`; ErrorBoundary-екран у мові Aria |
| Сумісність | iOS Safari 16+, Chrome/Android останні 2 версії; View Transitions — progressive enhancement |

## 10. Структура коду (ціль)

```
src/
  app/            # входи: providers, router (lazy routes), ErrorBoundary
  domain/         # dates.ts, money.ts, reminder.ts, statuses.ts + тести
  data/           # supabaseClient.ts, database.types.ts (gen), mappers.ts,
                  # queries.ts (хуки §7), demo/fixture.ts (VITE_DEMO)
  ui/             # дизайн-система Aria (§5.4), index.css
  features/
    timeline/     # головна
    entry/        # select-client + create-report + деталі дня
    debts/        # очікую + client-reports
    insights/     # звіт
    clients/      # управління клієнтами
    workers/      # селектор + діалог розподілу
    auth/
supabase/
  migrations/     # 0001_v3_schema, 0002_backfill, …
  seed.sql        # демо-дані для локальної розробки
scripts/
  ui-smoke.mjs    # клік-тести (§13.4)
docs/             # цей PRD + концепція + аудит
```

Перенесення — поступове (стара структура працює, поки фіча не переїхала);
`components/ui/*` (shadcn) лишаються постачальником примітивів для `ui/`.

## 11. Рішення «знайти в процесі» (🔎 реєстр)

| ID | Питання | Де вирішується | Критерій вибору |
|---|---|---|---|
| R-1 | Fixel: самохост woff2 vs fontsource-пакет | WP-2.1 | ліцензія OFL дотримана; кирилиця повна; ≤ 120 КБ woff2 сумарно |
| R-2 | Інваріант статусу: тригер БД vs доменна функція | WP-1.2 | одне джерело правди; простота міграції |
| R-3 | Pull-to-refresh: нативний overscroll vs кастом | WP-3.2 | працює в iOS standalone PWA |
| R-4 | `date-fns`/`next-themes`/`react-hook-form`: потрібні? | WP-0.3 | knip + грep реального вжитку |
| R-5 | Онбординг основної працівниці: діалог vs дефолт | WP-3.5 | мінімум тертя першого запуску |
| R-6 | View Transitions у react-router 7 | WP-3.1 | вбудований `viewTransition` проп vs ручний wrapper |

Кожне 🔎 закривається короткоюنотаткою в цьому файлі (розділ 15, Changelog).

## 12. Робочі пакети

Порядок строгий; кожен WP = окремий коміт(и) + верифікація §13 + оновлення
Changelog (§15). Застосунок працює після кожного WP.

### Фаза 0 — страхувальна сітка
- **WP-0.1** `tsc --noEmit` у `build` і CI; виправити 14 наявних помилок типів
  (мінімальними правками, без рефакторингу). DoD: build падає на type-error.
- **WP-0.2** Vitest + перші тести: винести `decimalToHours`/`hoursToDecimal`
  (зараз скопійовані у 3 файлах) у `domain/`, покрити таблицею кейсів.
  DoD: `npm test` зелений, дублікати видалені.
- **WP-0.3** knip: звіт → видалення мертвих deps/файлів (§4.2, R-4).
  DoD: build+smoke зелені, package.json чистий.
- **WP-0.4** GitHub Actions: `typecheck → lint → test → build` на PR.
- **WP-0.5** Оновлення платформи: React 19, Router 7, Vite 7 (по одному,
  зі smoke після кожного). DoD: всі екрани відкриваються, консоль чиста.

### Фаза 1 — дані
- **WP-1.1** Supabase CLI: `supabase/` каталог, наявні root-`.sql` →
  архів `supabase/legacy/`; `gen types` → `data/database.types.ts`.
- **WP-1.2** Міграція 0001 (схема §6.1 + RLS + views) на dev-проєкті; R-2.
- **WP-1.3** RLS-тести (SQL або мінімальний скрипт): чужий user_id — 0 рядків.
- **WP-1.4** Backfill 0002 + контрольні суми (§6.2). **Стоп-крапка: перед
  запуском на проді — підтвердження користувача.**
- **WP-1.5** `data/`: мапери (Zod), хуки §7, `demo/fixture.ts` за `VITE_DEMO=1`
  (постійна заміна тимчасовим demoMock-хакам).
- **WP-1.6** Переключити **існуючі** екрани на нові хуки (вигляд 2.x не
  чіпати): видалити focus-лісенери, ручні перерахунки, consolidated-хак.
  DoD: головна = 1-2 запити (network-панель), всі smoke зелені.

### Фаза 2 — мова Aria
- **WP-2.1** Токени §5 в `index.css`; шрифти Fixel (R-1); IconContext →
  regular/fill. DoD: скриншоти всіх екранів — нова палітра, без зламаних
  розкладок.
- **WP-2.2** `ui/`: базові компоненти (§5.4) + Skeleton/EmptyState/ConfirmSheet.
- **WP-2.3** Екрани: timeline (FR-1 п.1-2), entry (FR-2), debts (FR-3 п.1,3),
  insights (FR-4 п.1-2,4), day (FR-5), clients (FR-6), auth (FR-7) —
  послідовно, по одному коміту на екран, зі скриншотом.

### Фаза 3 — взаємодія покоління 3.0
- **WP-3.1** View transitions картка→деталі (R-6) + скелетони маршрутів.
- **WP-3.2** Свайпи карток (motion drag) + pull-to-refresh (R-3) — FR-1 п.3,6.
- **WP-3.3** MonthProgress + тап-по-даті (FR-1 п.1,4).
- **WP-3.4** «Нагадати» (FR-3 п.2), EarningsChart (FR-4 п.3).
- **WP-3.5** SaveIndicator у деталях дня (FR-5 п.2), онбординг працівниці (R-5),
  маршрут `/day/:id` з redirect.

### Фаза 4 — реліз
- **WP-4.1** Офлайн-read: persistQueryClient + банер; PWA-іконки/manifest Aria;
  `lang`, viewport, meta.
- **WP-4.2** Перфоманс-прохід: lazy routes, manualChunks, розміри в CI,
  бюджет §1 підтверджений.
- **WP-4.3** Sentry + ErrorBoundary; Playwright smoke у CI.
- **WP-4.4** Фінальний аудит за чек-лістом §14; версія в package.json → 3.0.0;
  тег `v3.0.0`.

## 13. Протокол верифікації (виконується агентом після кожного WP)

1. **Статика:** `npm run lint && npx tsc -p tsconfig.app.json --noEmit` — 0 помилок.
2. **Тести:** `npm test` (vitest) зелений.
3. **Збірка:** `npm run build` — успішна, розміри чанків у нормі бюджету.
4. **Smoke UI:** `VITE_DEMO=1 npm run dev` → `node scripts/ui-smoke.mjs`
   (playwright-core + системний Chrome):
   создать запис → позначити оплаченим → часткова оплата → видалити з
   підтвердженням → навігація доком; + elementFromPoint-перевірка, що жодна
   кнопка не перекрита доком.
5. **Скриншоти:** headless Chrome 390×844 (mobile) — екрани, яких торкнувся WP;
   агент дивиться очима: ієрархія, відступи, темна тема.
6. **Коміт:** Conventional Commits українською; один WP = 1–3 коміти;
   заборонено комітити demo-хаки поза `data/demo/` та артефакти скриншотів.

## 14. Definition of Done релізу 3.0

- [ ] Всі FR-1…FR-8 з AC виконані; всі 🔎 закриті записом у Changelog.
- [ ] 14/14 проблем аудиту (V3-ARCHITECTURE §0) мають статус «закрито» з
      посиланням на коміт.
- [ ] Метрики §1 виміряні й досягнуті (лог вимірів у PR релізу).
- [ ] Міграція даних підтверджена контрольними сумами; старі таблиці в архіві.
- [ ] CI зелений: typecheck, lint, unit, build, smoke.
- [ ] Ручний прохід усіх флоу на реальному телефоні (користувачка) — фінальне
      підтвердження перед тегом.

## 15. Changelog специфікації

| Дата | Хто | Зміна |
|---|---|---|
| 2026-07-04 | Fable 5 | v1.0 — початкова специфікація з концепції + аудиту |
