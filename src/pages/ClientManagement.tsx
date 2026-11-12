import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useClients, useAddClient, useUpdateClient, useDeleteClient } from "@/data/queries";
import { parseNumber, formatMoney } from "@/domain/money";
import type { Client } from "@/domain/types";
import { useI18n } from "@/i18n";
import { QueryError, StaleDataNotice } from "@/ui/QueryError";
import { markNav } from "@/ui/nav";
import { Column, EmptyState, Screen, TopBar } from "@/ui/Screen";
import { Button, IconButton } from "@/ui/Button";
import { FieldLabel, TextInput } from "@/ui/Field";
import { ClientAvatar } from "@/ui/Avatar";
import { Sheet } from "@/ui/Sheet";
import { ConfirmSheet } from "@/ui/ConfirmSheet";
import { stagger } from "@/ui/motion";

/**
 * Клієнти: список із ставками. Тап по рядку — лист редагування (імʼя, ставка,
 * видалення). «＋» угорі — той самий лист для нового клієнта.
 * Видалення завжди проходить через лист-підтвердження.
 */
export default function ClientManagement() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const query = useClients();
  const clients = query.data ?? [];
  const add = useAddClient(); const update = useUpdateClient(); const removeClient = useDeleteClient();
  const pending = add.isPending || update.isPending || removeClient.isPending;
  const busy = useRef(false);
  const [dialog, setDialog] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  const openAdd = () => { setName(""); setRate(""); setEditing(null); setDialog("add"); };
  const openEdit = (c: Client) => { setEditing(c); setName(c.name); setRate(String(c.hourlyRate)); setDialog("edit"); };

  const save = async () => {
    if (busy.current || pending) return;
    const hourlyRate = parseNumber(rate);
    if (!name.trim() || !Number.isFinite(hourlyRate) || hourlyRate <= 0) { toast.error(t("toast.fillAll")); return; }
    busy.current = true;
    try {
      if (dialog === "edit" && editing) await update.mutateAsync({ id: editing.id, name: name.trim(), hourlyRate });
      else await add.mutateAsync({ name: name.trim(), hourlyRate });
      setDialog(null);
    } catch { /* Mutation provides a message; preserve the form. */ } finally { busy.current = false; }
  };
  const remove = async (client: Client) => {
    if (busy.current || pending) return;
    busy.current = true;
    try { await removeClient.mutateAsync(client.id); setConfirmDelete(null); setDialog(null); }
    catch { /* Mutation provides a message. */ } finally { busy.current = false; }
  };
  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <Screen>
      <TopBar
        onBack={() => { markNav("back"); navigate(-1); }}
        backLabel={t("common.back")}
        title={t("clients.title")}
        actions={<IconButton label={t("select.addClient")} variant="primary" onClick={openAdd}><Plus size={21} strokeWidth={2.5} /></IconButton>}
      />

      <Column className="space-y-3 pb-12 pt-2">
        {query.isError && query.data && <StaleDataNotice onRetry={() => void query.refetch()} />}
        {query.isLoading ? (
          <div className="card list overflow-hidden">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 p-4"><div className="skeleton h-10 w-10 rounded-full" /><div className="skeleton h-4 flex-1 rounded-full" /></div>)}</div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<Users size={26} strokeWidth={2} />} title={t("select.noClients")}
            action={<Button variant="primary" size="lg" icon={<Plus size={18} strokeWidth={2.4} />} onClick={openAdd}>{t("select.addClient")}</Button>} />
        ) : (
          <div className="card list overflow-hidden [--list-inset:4rem]">
            {clients.map((c, i) => (
              <button key={c.id} type="button" onClick={() => openEdit(c)} aria-label={`${t("common.edit")}: ${c.name}`} style={stagger(i, 0.025, 0.2)}
                className="tap rise-in flex w-full items-center gap-3 px-4 py-3 text-left">
                <ClientAvatar name={c.name} id={c.id} />
                <span className="min-w-0 flex-1 truncate text-headline text-ink">{c.name}</span>
                <span className="num shrink-0 text-callout font-medium text-ink-2">{formatMoney(c.hourlyRate)} {t("common.perHour")}</span>
                <ChevronRight size={18} className="shrink-0 text-ink-4" />
              </button>
            ))}
          </div>
        )}
      </Column>

      <Sheet
        open={dialog !== null}
        onOpenChange={(open) => { if (!open && !pending) setDialog(null); }}
        title={dialog === "edit" ? t("clients.editClient") : t("clients.newClient")}
        footer={<Button variant="primary" size="lg" block disabled={pending} onClick={() => void save()}>{t("common.save")}</Button>}
      >
        <div className="space-y-4 pb-2">
          {dialog === "edit" && editing && (
            <div className="flex items-center gap-3 rounded-[16px] bg-well p-3">
              <ClientAvatar name={name || editing.name} id={editing.id} size="lg" />
              <span className="truncate text-headline text-ink">{name || editing.name}</span>
            </div>
          )}
          <div>
            <FieldLabel>{t("clients.name")}</FieldLabel>
            <TextInput disabled={pending} aria-label={t("clients.name")} value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("clients.namePlaceholder")} autoFocus={dialog === "add"} />
          </div>
          <div>
            <FieldLabel>{t("common.rate.hour")}</FieldLabel>
            <TextInput disabled={pending} inputMode="decimal" aria-label={t("common.rate.hour")} value={rate}
              onChange={(e) => setRate(e.target.value)} placeholder="0" suffix={t("common.perHour")} className="num" />
          </div>
          {dialog === "edit" && editing && (
            <Button variant="ghost" tone="alert" block icon={<Trash2 size={17} strokeWidth={2.2} />} disabled={pending} onClick={() => setConfirmDelete(editing)}>
              {t("common.delete")}
            </Button>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title={`${t("common.delete")}: ${confirmDelete?.name ?? ""}?`}
        description={t("clients.confirmDelete")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        confirmDisabled={pending}
        onConfirm={() => { if (confirmDelete) void remove(confirmDelete); }}
      />
    </Screen>
  );
}
