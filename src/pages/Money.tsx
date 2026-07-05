import { AppShell } from "@/ui/AppShell";
import { AppBar } from "@/ui/AppBar";

/** Заглушка — Гроші (Борги | Огляд) у WP-5. */
export default function Money() {
  return (
    <AppShell>
      <AppBar title="Гроші" />
      <div className="container px-4 pb-dock pt-6 text-ink-2">Борги та огляд — скоро.</div>
    </AppShell>
  );
}
