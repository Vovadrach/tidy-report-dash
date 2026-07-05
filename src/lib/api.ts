import { isDemo } from "@/data";
import { realApi } from "./api.real";
import { demoApi } from "./api.demo";

/**
 * `api` — інтерфейс даних для екранів (оригінальний контракт).
 *  - прод: realApi (пряма стара схема, api.real.ts);
 *  - VITE_DEMO=1: demoApi — фасад над чистим `backend` (api.demo.ts).
 * Архітектура даних (backend abstraction, domain, v3) лишається під капотом.
 */
export const api = (isDemo ? demoApi : realApi) as typeof realApi;
