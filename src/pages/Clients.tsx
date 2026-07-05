import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { useClients, useWorkDays } from "@/data/queries";
import { clientBalances } from "@/domain/stats";
import { AppShell } from "@/ui/AppShell";
import { AppBar } from "@/ui/AppBar";
import { Row } from "@/ui/Row";
import { Money } from "@/ui/atoms";
import { EmptyState } from "@/ui/EmptyState";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { ClientFormSheet } from "@/components/ClientFormSheet";

export default function Clients() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const { data: days = [] } = useWorkDays();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const balByClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of clientBalances(days)) m.set(b.clientId, b.totalDue);
    return m;
  }, [days]);

  const filtered = (clients ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  if (isLoading) return <ScreenSkeleton />;

  return (
    <AppShell>
      <AppBar
        title="Клієнти"
        right={
          <button
            type="button"
            aria-label="Додати клієнта"
            onClick={() => setAddOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink active:bg-accent-strong"
          >
            <UserPlus size={18} />
          </button>
        }
      />

      <div className="container space-y-3 px-4 pb-dock pt-3">
        {(clients?.length ?? 0) > 0 && (
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="field pl-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук клієнта"
            />
          </div>
        )}

        {(clients?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Немає клієнтів"
            subtitle="Додай першого клієнта, щоб записувати роботу"
            action={
              <button className="btn btn-accent" onClick={() => setAddOpen(true)}>
                Додати клієнта
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-ink-3">Нічого не знайдено</p>
        ) : (
          <div className="surface-card divide-y divide-line overflow-hidden">
            {filtered.map((c) => {
              const due = balByClient.get(c.id) ?? 0;
              return (
                <Row
                  key={c.id}
                  onClick={() => navigate(`/client/${c.id}`)}
                  className="px-4"
                  leading={
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-sm font-semibold text-ink-2">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  }
                  title={c.name}
                  subtitle={`${c.hourlyRate} €/год`}
                  meta={
                    due > 0.005 ? (
                      <span className="pill pill-danger">
                        борг&nbsp;<Money value={due} />
                      </span>
                    ) : (
                      <span className="pill pill-ok">сплачено</span>
                    )
                  }
                  trailing={<ChevronRight size={18} className="ml-1 text-ink-3" />}
                />
              );
            })}
          </div>
        )}
      </div>

      <ClientFormSheet open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  );
}
