import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Users, CalendarPlus, ListPlus } from "lucide-react";
import { useSetPayment, useDeleteReport, useWorkDays } from "@/data/queries";
import { periodStats } from "@/domain/stats";
import {
  addMonths,
  dayOfWeekName,
  formatMonthYear,
  formatShortDate,
  isSameMonth,
  monthRange,
  toISODate,
  todayLocal,
} from "@/domain/dates";
import { inRange } from "@/domain/dates";
import type { WorkDay } from "@/domain/types";
import { usePullToRefresh } from "@/ui/usePullToRefresh";
import { AppBar } from "@/ui/AppBar";
import { Row } from "@/ui/Row";
import { SwipeRow } from "@/ui/SwipeRow";
import { StatusDot } from "@/ui/StatusDot";
import { LineProgress } from "@/ui/LineProgress";
import { Money, HoursBadge } from "@/ui/atoms";
import { EmptyState } from "@/ui/EmptyState";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { ConfirmSheet } from "@/ui/ConfirmSheet";
import { Button } from "@/ui/Button";
import { AppShell } from "@/ui/AppShell";
import { useSheets } from "@/ui/AppSheets";

const dayLabel = (iso: string, today: string, yesterday: string): string => {
  if (iso === today) return "Сьогодні";
  if (iso === yesterday) return "Вчора";
  return `${dayOfWeekName(iso)}, ${formatShortDate(iso)}`;
};

export default function Feed() {
  const navigate = useNavigate();
  const { openQuickAdd, openDay } = useSheets();
  const { data: days, isLoading, isError, refetch } = useWorkDays();
  const setPayment = useSetPayment();
  const del = useDeleteReport();
  const { pulling, refreshing } = usePullToRefresh(() => refetch());

  const now = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [pending, setPending] = useState<WorkDay | null>(null);

  const today = todayLocal();
  const yesterday = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const range = monthRange(anchor);
  const isCurrentMonth = isSameMonth(anchor, now);

  const monthDays = useMemo(
    () =>
      (days ?? [])
        .filter((d) => inRange(d.date, range))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    // range — похідне від anchor; range.from/to стабільні рядки
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, range.from, range.to],
  );

  const groups = useMemo(() => {
    const map = new Map<string, WorkDay[]>();
    for (const d of monthDays) {
      const arr = map.get(d.date) ?? [];
      arr.push(d);
      map.set(d.date, arr);
    }
    return [...map.entries()];
  }, [monthDays]);

  const stats = periodStats(days ?? [], range);

  if (isLoading) return <ScreenSkeleton />;

  return (
    <AppShell>
      <AppBar>
        <div className="py-2">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Профіль"
              onClick={() => navigate("/profile")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-sm font-semibold text-ink-2"
            >
              Я
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Попередній місяць"
                onClick={() => setAnchor((a) => addMonths(a, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))}
                className="min-w-32 text-center text-base font-semibold"
              >
                {formatMonthYear(anchor)}
              </button>
              <button
                type="button"
                aria-label="Наступний місяць"
                onClick={() => setAnchor((a) => addMonths(a, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Клієнти"
              onClick={() => navigate("/clients")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-ink-2"
            >
              <Users size={18} />
            </button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="display text-[2rem] leading-none">
                <Money value={stats.earned} />
              </div>
              <div className="caption mt-1">
                {stats.hours ? `${Math.round(stats.hours * 10) / 10} год · ` : ""}
                сплачено <Money value={stats.paid} />
              </div>
            </div>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))}
                className="pill pill-neutral"
              >
                Поточний
              </button>
            )}
          </div>
          <div className="mt-3">
            <LineProgress value={stats.paid} max={stats.earned} />
          </div>
        </div>
      </AppBar>

      <div className="container px-4 pb-dock pt-2">
        {(pulling > 0 || refreshing) && (
          <div className="flex justify-center py-2 text-xs text-ink-3">
            {refreshing ? "Оновлюю…" : pulling >= 1 ? "Відпусти, щоб оновити" : "Тягни, щоб оновити"}
          </div>
        )}

        {isError && (
          <div className="surface-card my-4 p-5 text-center">
            <p className="mb-3 text-ink-2">Не вдалося завантажити</p>
            <Button onClick={() => refetch()} className="mx-auto">
              Спробувати ще
            </Button>
          </div>
        )}

        {groups.length === 0 ? (
          <EmptyState
            icon={<ListPlus />}
            title="Ще немає записів"
            subtitle="Натисни + унизу, щоб записати першу роботу цього місяця"
            action={<Button onClick={() => openQuickAdd()}>Додати запис</Button>}
          />
        ) : (
          <div className="space-y-5 pt-2">
            {groups.map(([date, items]) => (
              <section key={date}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="caption">{dayLabel(date, today, yesterday)}</h2>
                  <button
                    type="button"
                    aria-label="Додати на цей день"
                    onClick={() => openQuickAdd({ date })}
                    className="text-ink-3 active:text-accent"
                  >
                    <CalendarPlus size={16} />
                  </button>
                </div>
                <div className="surface-card divide-y divide-line overflow-hidden">
                  {items.map((d) => (
                    <SwipeRow
                      key={d.id}
                      disabled={d.isPlanned}
                      onSwipeRight={
                        d.status === "paid"
                          ? undefined
                          : () =>
                              setPayment.mutate({ dayId: d.id, status: "paid", paidAmount: d.amount })
                      }
                      onSwipeLeft={() => setPending(d)}
                    >
                      <Row
                        onClick={() => openDay(d.id)}
                        className="px-4"
                        leading={
                          <StatusDot
                            status={d.isPlanned ? "planned" : d.status}
                            fraction={d.isPlanned || d.amount === 0 ? undefined : d.paidAmount / d.amount}
                          />
                        }
                        title={d.clientName}
                        subtitle={d.isPlanned ? "Заплановано" : d.note}
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
                    </SwipeRow>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Видалити запис?"
        description={pending ? `${pending.clientName} · ${formatShortDate(pending.date)}` : ""}
        onConfirm={() => {
          if (pending) del.mutate(pending.reportId);
          setPending(null);
        }}
      />
    </AppShell>
  );
}
