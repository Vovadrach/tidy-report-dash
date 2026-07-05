import { AppShell } from "@/ui/AppShell";
import { AppBar } from "@/ui/AppBar";

/** Заглушка — повний список клієнтів у WP-4. */
export default function Clients() {
  return (
    <AppShell>
      <AppBar title="Клієнти" />
      <div className="container px-4 pb-dock pt-6 text-ink-2">Список клієнтів — скоро.</div>
    </AppShell>
  );
}
