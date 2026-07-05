import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Client } from "@/types/report";
import { UserPlus, ArrowLeft, ChevronRight, Search, Users, LogOut, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { SettingsSheet } from "@/components/SettingsSheet";

export default function SelectClient() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateParam = params.get("date");
  const { signOut } = useAuth();
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setClients(await api.getClients());
      } catch (e) {
        toast.error(t("toast.loadClientsError"));
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id: string) =>
    navigate(`/create-report?clientId=${id}${dateParam ? `&date=${dateParam}` : ""}`, { viewTransition: true });

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-2 px-4 pt-3">
        <button type="button" aria-label={t("common.back")} onClick={() => navigate("/", { viewTransition: true })}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={20} strokeWidth={2.3} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">{t("select.title")}</h1>
        <button type="button" aria-label={t("settings.title")} onClick={() => setSettingsOpen(true)}
          className="press flex h-10 w-10 items-center justify-center rounded-full text-ink-3">
          <SlidersHorizontal size={19} strokeWidth={1.6} />
        </button>
        <button type="button" aria-label={t("select.addClient")} onClick={() => navigate("/client-management", { viewTransition: true })}
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <UserPlus size={18} strokeWidth={2.3} />
        </button>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-4 pb-10 pt-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("select.search")}
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-base outline-none focus:border-primary" />
        </div>

        {loading ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="ibadge tint-indigo mb-4 h-16 w-16"><Users size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">{q ? t("select.notFound") : t("select.noClients")}</p>
            {!q && (
              <button onClick={() => navigate("/client-management", { viewTransition: true })}
                className="press mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                {t("select.addClient")}
              </button>
            )}
          </div>
        ) : (
          <div className="card-flat divide-y divide-border overflow-hidden rounded-2xl">
            {filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => pick(c.id)}
                className="press flex w-full items-center gap-3 p-3.5 text-left">
                <span className="ibadge tint-indigo h-11 w-11 font-display text-base font-semibold"
                  style={{ viewTransitionName: `avatar-${c.id}` }}>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate font-semibold text-foreground">{c.name}</span>
                <span className="text-sm font-semibold text-primary">
                  {c.hourlyRate || c.hourly_rate || 0}{t("common.perHour")}
                </span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        <button onClick={async () => { await signOut(); navigate("/login"); }}
          className="press mx-auto mt-6 flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground">
          <LogOut size={15} /> {t("select.signOut")}
        </button>
      </main>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
