import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, LogOut, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/data/queries";
import { isISODate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { SettingsSheet } from "@/components/SettingsSheet";
import { QueryError, StaleDataNotice } from "@/ui/QueryError";
import { useGo } from "@/ui/nav";
import { useToday } from "@/ui/useToday";
import { dayLabel } from "@/ui/dateLabel";
import { Column, EmptyState, Screen, TopBar } from "@/ui/Screen";
import { Button, IconButton } from "@/ui/Button";
import { TextInput } from "@/ui/Field";
import { ClientAvatar } from "@/ui/Avatar";
import { stagger } from "@/ui/motion";

/** Крок 1 створення запису: кого обслуговували. Пошук зверху, список нижче. */
export default function SelectClient() {
  const go = useGo();
  const [params] = useSearchParams();
  const dateParam = params.get("date");
  const validDate = dateParam && isISODate(dateParam) ? dateParam : null;
  const { signOut } = useAuth();
  const i18n = useI18n();
  const { t } = i18n;
  const today = useToday();
  const query = useClients();
  const clients = query.data ?? [];
  const [q, setQ] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pick = (id: string) => go(`/create-report?clientId=${id}${validDate ? `&date=${validDate}` : ""}`);
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <Screen>
      <TopBar
        onBack={() => go("/", "back")}
        backLabel={t("common.back")}
        title={t("select.title")}
        subtitle={validDate ? dayLabel(validDate, today, i18n) : undefined}
        actions={<>
          <IconButton label={t("settings.title")} variant="ghost" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={19} strokeWidth={2} /></IconButton>
          <IconButton label={t("select.addClient")} variant="tonal" onClick={() => go("/client-management")}><UserPlus size={19} strokeWidth={2.2} /></IconButton>
        </>}
      />

      <Column className="space-y-3 pb-12 pt-2">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("select.search")} aria-label={t("select.search")}
          icon={<Search size={18} strokeWidth={2.2} />} wrapClassName="bg-sunken" />

        {query.isError && query.data && <StaleDataNotice onRetry={() => void query.refetch()} />}
        {query.isLoading ? (
          <div className="card list overflow-hidden">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 p-4"><div className="skeleton h-10 w-10 rounded-full" /><div className="skeleton h-4 flex-1 rounded-full" /></div>)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={26} strokeWidth={2} />}
            title={q ? t("select.notFound") : t("select.noClients")}
            action={!q && <Button variant="primary" size="lg" icon={<UserPlus size={18} strokeWidth={2.3} />} onClick={() => go("/client-management")}>{t("select.addClient")}</Button>}
          />
        ) : (
          <div className="card list overflow-hidden [--list-inset:4rem]">
            {filtered.map((c, i) => (
              <button key={c.id} type="button" onClick={() => pick(c.id)} style={stagger(i, 0.025, 0.2)}
                className="tap rise-in flex w-full items-center gap-3 px-4 py-3 text-left">
                <ClientAvatar name={c.name} id={c.id} transitionName={`avatar-${c.id}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-headline text-ink">{c.name}</span>
                  <span className="block num text-footnote text-ink-3">{formatMoney(c.hourlyRate)} {t("common.perHour")}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-4" />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button variant="ghost" size="sm" icon={<LogOut size={15} strokeWidth={2.2} />}
            onClick={async () => { try { await signOut(); go("/login", "back"); } catch { toast.error(t("common.error")); } }}>
            {t("select.signOut")}
          </Button>
        </div>
      </Column>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Screen>
  );
}
