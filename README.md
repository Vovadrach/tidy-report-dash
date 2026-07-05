# Ясно — облік прибирання

Персональний мобільний застосунок (PWA) для самозайнятої прибиральниці: за 15 секунд
записати роботу (клієнт + години → сума), бачити скільки зароблено й сплачено, у один
дотик приймати оплату, і мати живу **картку клієнта** з повною історією робіт.

Покоління **4.0 «Ясно»** — світлий чистий дизайн, чисті лінії, колір = стан.
Єдине джерело правди — [`docs/PRD-4.0-YASNO.md`](docs/PRD-4.0-YASNO.md).

## Стек
React 19 · React Router 7 · TanStack Query 5 (+persist, offline-read) · Supabase ·
Tailwind CSS 4 (CSS-first) · Vite 7 · Motion · vaul (нижні листи) · Lucide (іконки) ·
Zod 4 · Inter (self-host) · PWA (vite-plugin-pwa) · Vitest · Playwright (smoke).

Архітектура коду:
- `src/domain/` — чисті доменні розрахунки (гроші, час, дати, статистика) + тести.
- `src/data/` — контракт `Backend` (supabase / demo-fixture), React Query хуки, zod-маппери.
- `src/ui/` — примітиви дизайн-мови «Ясно».
- `src/pages/` — екрани.

## Розробка
```sh
npm install
npm run dev                 # прод-бекенд (потрібні VITE_SUPABASE_*)
VITE_DEMO=1 npm run dev     # in-memory demo (розробка / скриншоти / smoke)
```

## Скрипти
```sh
npm run build       # tsc --noEmit && vite build (типи блокують збірку)
npm run typecheck
npm run lint
npm run test        # vitest
node scripts/ui-smoke.mjs   # UI smoke (потрібен запущений dev на VITE_DEMO=1)
```

## Змінні оточення
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SENTRY_DSN=...   # опційно, вмикає спостережуваність
VITE_DEMO=1           # опційно, demo-бекенд без Supabase
```

## Дані
Схема мігрує на v3 (`work_days_v3` + в'ю замість обгортки `reports`). Порядок застосування —
`supabase/README.md` і §10 PRD (дія користувача: потрібен доступ до прод-БД).
