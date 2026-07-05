import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Client } from "@/types/report";
import { Pencil, Trash2, Plus, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export default function ClientManagement() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setClients(await api.getClients());
    } catch (e) {
      toast.error(t("toast.loadClientsError"));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setName("");
    setRate("");
    setEditing(null);
    setDialog("add");
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setRate(String(c.hourlyRate || c.hourly_rate || 0));
    setDialog("edit");
  };

  const save = async () => {
    if (!name.trim() || !rate) {
      toast.error(t("toast.fillAll"));
      return;
    }
    const hourlyRate = parseFloat(rate.replace(",", ".")) || 0;
    try {
      if (dialog === "edit" && editing) {
        await api.updateClient(editing.id, { name: name.trim(), hourlyRate });
        toast.success(t("toast.clientUpdated"));
      } else {
        await api.addClient({ name: name.trim(), hourlyRate });
        toast.success(t("toast.clientAdded"));
      }
      setDialog(null);
      await loadClients();
    } catch (e) {
      toast.error(t("toast.saveError"));
      console.error(e);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("clients.confirmDelete"))) return;
    try {
      await api.deleteClient(id);
      await loadClients();
      toast.success(t("toast.clientDeleted"));
    } catch (e) {
      toast.error(t("toast.deleteError"));
      console.error(e);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => navigate(-1)}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft size={20} strokeWidth={2.3} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">{t("clients.title")}</h1>
        <button
          type="button"
          aria-label={t("select.addClient")}
          onClick={openAdd}
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <main className="mx-auto max-w-md space-y-2.5 px-4 pb-10 pt-4">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="ibadge tint-indigo mb-4 h-16 w-16"><Users size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">{t("select.noClients")}</p>
            <button onClick={openAdd} className="press mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              {t("select.addClient")}
            </button>
          </div>
        ) : (
          clients.map((c) => (
            <div key={c.id} className="card-flat flex items-center gap-3 rounded-2xl p-3.5">
              <span className="ibadge tint-indigo h-11 w-11 font-display text-base font-semibold">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{c.name}</p>
                <p className="text-sm text-primary">{c.hourlyRate || c.hourly_rate || 0}{t("common.perHour")}</p>
              </div>
              <button onClick={() => openEdit(c)} aria-label={t("common.edit")} className="press ibadge tint-blue h-9 w-9">
                <Pencil size={16} strokeWidth={2.3} />
              </button>
              <button onClick={() => remove(c.id)} aria-label={t("common.delete")} className="press ibadge tint-rose h-9 w-9">
                <Trash2 size={16} strokeWidth={2.3} />
              </button>
            </div>
          ))
        )}
      </main>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl border border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dialog === "edit" ? t("clients.editClient") : t("clients.newClient")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">{t("clients.name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("clients.namePlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">{t("common.rate.hour")}</label>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-14 text-base outline-none focus:border-primary"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {t("common.perHour")}
                </span>
              </div>
            </div>
            <button
              onClick={save}
              className="press mt-1 w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground"
            >
              {t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
