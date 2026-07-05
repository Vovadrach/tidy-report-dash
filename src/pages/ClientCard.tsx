import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Bell, HandCoins, ListPlus, Pencil, Plus } from "lucide-react";
import { useClients, useDeleteClient, useWorkDays } from "@/data/queries";
import { clientBalances } from "@/domain/stats";
import { reminderMessage } from "@/domain/reminder";
import { formatFullDate, inRange, monthRange } from "@/domain/dates";
import type { WorkDay } from "@/domain/types";
import { AppBar } from "@/ui/AppBar";
import { Row } from "@/ui/Row";
import { StatusDot } from "@/ui/StatusDot";
import { LineProgress } from "@/ui/LineProgress";
import { Money, HoursBadge } from "@/ui/atoms";
import { Button } from "@/ui/Button";
import { Segmented } from "@/ui/Segmented";
import { EmptyState } from "@/ui/EmptyState";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { ConfirmSheet } from "@/ui/ConfirmSheet";
import { ClientFormSheet } from "@/components/ClientFormSheet";
import { useSheets } from "@/ui/AppSheets";

type Filter = "all" | "due" | "month";

export default function ClientCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openQuickAdd, openDay, openPayment } = useSheets();
  const { data: clients, isLoading } = useClients();
  const { data: days = [] } = useWorkDays();
  const delClient = useDeleteClient();

  const [filter, setFilter] = useState<Filter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const client = clients?.find((c) => c.id === id);
  const balance = useMemo(() => clientBalances(days).find((b) => b.clientId === id), [days, id]);

  const shown = useMemo(() => {
    const mine = days.filter((d) => d.clientId === id);
    const mRange = monthRange(new Date());
    let list = mine;
    if (filter === "due") {
      list = mine.filter((d) => !d.isPlanned && d.amount - Math.min(d.paidAmount, d.amount) > 0.005);
    } else if (filter === "month") {
      list = mine.filter((d) => inRange(d.date, mRange));
    }
    return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [days, id, filter]);

  if (isLoading) return <ScreenSkeleton />;

  if (!client) {
    return (
      <div className="min-h-dvh bg-bg">
        <AppBar left={<BackButton onBack={() => navigate("/clients")} />} title="Клієнт" />
        <p className="container px-4 pt-10 text-center text-ink-2">Клієнта не знайдено</p>
      </div>
    );
  }

  const due = balance?.totalDue ?? 0;
  const earned = balance?.totalEarned ?? 0;
  const paid = balance?.totalPaid ?? 0;
  const canRemind = due > 0.005 && !!balance;

  const remind = async () => {
    if (!balance) return;
    const msg = reminderMessage(balance);
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else {
        await navigator.clipboard.writeText(msg);
        toast.success("Нагадування скопійовано");
      }
    } catch {
      /* користувач скасував share */
    }
  };

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        left={<BackButton onBack={() => navigate("/clients")} />}
        title={client.name}
        right={
          <button
            type="button"
            aria-label="Редагувати клієнта"
            onClick={() => setEditOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
          >
            <Pencil size={18} />
          </button>
        }
      />

      <div className="container space-y-4 px-4 pb-10 pt-2">
        {/* Баланс */}
        <div className="surface-card space-y-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="caption">Борг</div>
              <div className="display text-3xl">
                <Money value={due} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="text-right active:opacity-60"
            >
              <div className="caption">Ставка</div>
              <div className="font-semibold">{client.hourlyRate} €/год</div>
            </button>
          </div>
          <LineProgress value={paid} max={earned} />
          <div className="caption">
            Зароблено <Money value={earned} /> · сплачено <Money value={paid} />
          </div>
        </div>

        {/* Дії */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => openQuickAdd({ clientId: id })}>
            <Plus size={18} /> Записати роботу
          </Button>
          <Button variant="ghost" disabled={due <= 0.005} onClick={() => id && openPayment(id)}>
            <HandCoins size={18} /> Прийняти оплату
          </Button>
          <Button variant="ghost" disabled={!canRemind} onClick={remind}>
            <Bell size={18} /> Нагадати
          </Button>
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil size={18} /> Редагувати
          </Button>
        </div>

        {/* Історія */}
        <div>
          <Segmented<Filter>
            className="mb-3"
            options={[
              { value: "all", label: "Усі" },
              { value: "due", label: "Борг" },
              { value: "month", label: "Цей місяць" },
            ]}
            value={filter}
            onChange={setFilter}
          />

          {shown.length === 0 ? (
            <EmptyState
              icon={<ListPlus />}
              title="Ще немає робіт"
              subtitle="Запиши першу роботу для цього клієнта"
              action={<Button onClick={() => openQuickAdd({ clientId: id })}>Записати роботу</Button>}
            />
          ) : (
            <div className="surface-card divide-y divide-line overflow-hidden">
              {shown.map((d: WorkDay) => (
                <Row
                  key={d.id}
                  onClick={() => openDay(d.id)}
                  className="px-4"
                  leading={
                    <StatusDot
                      status={d.isPlanned ? "planned" : d.status}
                      fraction={d.isPlanned || d.amount === 0 ? undefined : d.paidAmount / d.amount}
                    />
                  }
                  title={formatFullDate(d.date)}
                  subtitle={d.note ?? (d.isPlanned ? "Заплановано" : undefined)}
                  meta={
                    <div className="flex flex-col items-end gap-0.5">
                      {d.amount > 0 && (
                        <span className="font-semibold">
                          <Money value={d.amount} />
                        </span>
                      )}
                      <HoursBadge hours={d.hours} />
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setConfirmDel(true)}
          className="py-2 text-sm font-medium text-danger"
        >
          Видалити клієнта
        </button>
      </div>

      <ClientFormSheet open={editOpen} onOpenChange={setEditOpen} client={client} />
      <ConfirmSheet
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Видалити клієнта?"
        description={`${client.name} та всі пов'язані записи буде видалено.`}
        confirmLabel="Видалити"
        onConfirm={() => {
          delClient.mutate(client.id);
          navigate("/clients");
        }}
      />
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      aria-label="Назад"
      onClick={onBack}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
