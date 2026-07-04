import type { Backend } from "./backend";
import { supabaseBackend } from "./backend.supabase";

/**
 * Активний бекенд. VITE_DEMO=1 → in-memory фікстура (dev/скриншоти/smoke);
 * у прод-збірці гілка статично відкидається разом із demo-чанком.
 */
let active: Backend = supabaseBackend;

if (import.meta.env.VITE_DEMO === "1") {
  const { demoBackend } = await import("./demo/fixture");
  active = demoBackend;
}

export const backend = active;
export const isDemo = import.meta.env.VITE_DEMO === "1";
