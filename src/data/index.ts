import type { Backend } from "./backend";
import { supabaseBackend } from "./backend.supabase";

/**
 * Активний бекенд.
 *  - VITE_DEMO=1 → in-memory фікстура (dev/скриншоти/smoke);
 *  - VITE_V3=1   → схема v3 (work_days_v3, після застосування міграцій);
 *  - інакше      → легасі-схема (reports → work_days).
 * У прод-збірці невживані гілки статично відкидаються.
 */
let active: Backend = supabaseBackend;

if (import.meta.env.VITE_DEMO === "1") {
  const { demoBackend } = await import("./demo/fixture");
  active = demoBackend;
} else if (import.meta.env.VITE_V3 === "1") {
  const { supabaseBackendV3 } = await import("./backend.supabase.v3");
  active = supabaseBackendV3;
}

export const backend = active;
export const isDemo = import.meta.env.VITE_DEMO === "1";
