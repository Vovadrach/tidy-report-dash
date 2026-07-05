import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, PartyPopper } from "lucide-react";
import { useWorkDays } from "@/data/queries";
import { clientBalances, debtors, monthlySummary, periodStats } from "@/domain/stats";
import { monthRange, yearRange } from "@/domain/dates";
import { AppShell } from "@/ui/AppShell";
import { AppBar } from "@/ui/AppBar";
import { Row } from "@/ui/Row";
import { Money as Eur, HoursBadge } from "@/ui/atoms";
import { Segmented } from "@/ui/Segmented";
import { LineProgress } from "@/ui/LineProgress";
import { MonthsChart } from "@/ui/MonthsChart";
import { EmptyState } from "@/ui/EmptyState";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { useSheets } from "@/ui/AppSheets";

type Tab = "debts" | "overview";
type Period = "month" | "year" | "all";

export default function Money() {
  const navigate = useNavigate();
  const { openPayment } = useSheets();
  const { data: days = [], isLoading } = useWorkDays();
  const [tab, setTab] = useState<Tab>("debts");
  const [period, setPeriod] = useState<Period>("month");

  const now = useMemo(() => new Date(), []);
  const debts = useMemo(() => debtors(days), [days]);
  const totalDue = debts.reduce((s, b) => s + b.totalDue, 0);
  const totalUnpaidHours = debts.reduce((s, b) => s + b.unpaidHours, 0);

  const range =
    period === "month"
      ? monthRange(now)
      : period === "year"
        ? yearRange(now.getFullYear())
        : { from: "0000-01-01", to: "9999-12-31" };
  const stats = periodStats(days, range);
  const months = useMemo(() => monthlySummary(days, 6, now), [days, now]);
  const top = useMemo(
    () => clientBalances(days).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 5),
    [days],
  );

  if (isLoading) return <ScreenSkeleton />;

  return (
    <AppShell>
      <AppBar title="Гроші" />
      <div className="container space-y-4 px-4 pb-dock pt-3">
        <Segmented<Tab>
          options={[
            { value: "debts", label: "Борги" },
            { value: "overview", label: "Огляд" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "debts" ? (
          <>
            <div className="surface-card p-5 text-center">
              <p className="caption">Тобі винні</p>
              <p className="display mt-1 text-4xl">
                <Eur value={totalDue} />
              </p>
              {totalUnpaidHours > 0 && (
                <p className="caption mt-1">
                  за {Math.round(totalUnpaidHours * 10) / 10} несплачених год
                </p>
              )}
            </div>

            {debts.length === 0 ? (
              <EmptyState icon={<PartyPopper />} title="Все сплачено 🎉" subtitle="Немає боргів" />
            ) : (
              <div className="surface-card divide-y divide-line overflow-hidden">
                {debts.map((b) => (
                  <Row
                    key={b.clientId}
                    onClick={() => openPayment(b.clientId)}
                    className="px-4"
                    leading={
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-sm font-semibold text-ink-2">
                        {b.clientName.charAt(0).toUpperCase()}
                      </div>
                    }
                    title={b.clientName}
                    subtitle={<HoursBadge hours={b.unpaidHours} />}
                    meta={
                      <span className="pill pill-danger">
                        <Eur value={b.totalDue} />
                      </span>
                    }
                    trailing={<ChevronRight size={18} className="ml-1 text-ink-3" />}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Segmented<Period>
              options={[
                { value: "month", label: "Місяць" },
                { value: "year", label: "Рік" },
                { value: "all", label: "Весь час" },
              ]}
              value={period}
              onChange={setPeriod}
            />

            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Зароблено" value={<Eur value={stats.earned} />} />
              <StatTile label="Години" value={`${Math.round(stats.hours * 10) / 10} г`} />
              <StatTile label="Сплачено" value={<Eur value={stats.paid} />} tone="ok" />
              <StatTile label="Залишок" value={<Eur value={stats.due} />} tone={stats.due > 0 ? "danger" : undefined} />
            </div>

            <div className="surface-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="caption">Останні 6 місяців</p>
                <LineProgress className="w-24" value={stats.paid} max={stats.earned || 1} />
              </div>
              <MonthsChart months={months} />
            </div>

            {top.length > 0 && (
              <div>
                <p className="caption mb-2 px-1">Топ клієнтів</p>
                <div className="surface-card divide-y divide-line overflow-hidden">
                  {top.map((b, i) => (
                    <Row
                      key={b.clientId}
                      onClick={() => navigate(`/client/${b.clientId}`)}
                      className="px-4"
                      leading={
                        <span className="w-5 text-center text-sm font-semibold text-ink-3">{i + 1}</span>
                      }
                      title={b.clientName}
                      subtitle={<HoursBadge hours={b.totalHours} />}
                      meta={
                        <span className="font-semibold">
                          <Eur value={b.totalEarned} />
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "danger";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="surface-card p-4">
      <p className="caption">{label}</p>
      <p className={`display mt-1 text-xl ${color}`}>{value}</p>
    </div>
  );
}
